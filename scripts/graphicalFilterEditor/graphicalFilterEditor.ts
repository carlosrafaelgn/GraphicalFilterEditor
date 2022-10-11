//
// MIT License
//
// Copyright (c) 2012-2020 Carlos Rafael Gimenes das Neves
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// https://github.com/carlosrafaelgn/GraphicalFilterEditor
//

interface FilterChangedCallback {
	(): void;
}

enum GraphicalFilterEditorIIRType {
	None = 0,
	Peaking = 1,
	Shelf = 2
}

abstract class Filter {
	private source: AudioNode | null;

	public filterChangedCallback: FilterChangedCallback | null | undefined;

	public constructor(filterChangedCallback?: FilterChangedCallback | null) {
		this.source = null;
		this.filterChangedCallback = filterChangedCallback;
	}

	public abstract get inputNode(): AudioNode | null;
	public abstract get outputNode(): AudioNode | null;

	public connectSourceAndDestination(source: AudioNode | null, destination: AudioNode | null): boolean {
		const s = this.connectSourceToInput(source);
		return this.connectOutputToDestination(destination) && s;
	}

	public disconnectSourceAndDestination(): boolean {
		const s = this.disconnectSourceFromInput();
		return this.disconnectOutputFromDestination() && s;
	}

	public disconnectSourceFromInput(): boolean {
		if (this.source) {
			this.source.disconnect();
			this.source = null;
			return true;
		}
		return false;
	}

	public connectSourceToInput(source: AudioNode | null): boolean {
		this.disconnectSourceFromInput();
		this.source = source;
		if (source) {
			source.disconnect();
			const inputNode = this.inputNode;
			if (inputNode) {
				source.connect(inputNode, 0, 0);
				return true;
			}
		}
		return false;
	}

	public connectOutputToDestination(destination: AudioNode | null): boolean {
		const outputNode = this.outputNode;
		if (outputNode) {
			outputNode.disconnect();
			if (destination)
				outputNode.connect(destination, 0, 0);
			return true;
		}
		return false;
	}

	public disconnectOutputFromDestination(): boolean {
		const outputNode = this.outputNode;
		if (outputNode) {
			outputNode.disconnect();
			return true;
		}
		return false;
	}

	public destroy(): void {
		this.disconnectSourceFromInput();
		this.disconnectOutputFromDestination();
	}
}

class GraphicalFilterEditor extends Filter {
	// Must be in sync with c/common.h
	// Sorry, but due to the frequency mapping I created, this class will only work with
	// 500 visible bins... in order to change this, a new frequency mapping must be created...
	public static readonly visibleBinCount = 500;
	public static readonly validYRangeHeight = 321;
	public static readonly zeroChannelValueY = GraphicalFilterEditor.validYRangeHeight >>> 1;
	public static readonly maximumChannelValue = GraphicalFilterEditor.zeroChannelValueY;
	public static readonly minimumChannelValue = -GraphicalFilterEditor.zeroChannelValueY;
	public static readonly minusInfiniteChannelValue = GraphicalFilterEditor.minimumChannelValue - 1;
	public static readonly maximumChannelValueY = 0;
	public static readonly minimumChannelValueY = GraphicalFilterEditor.validYRangeHeight - 1;
	public static readonly maximumFilterLength = 8192;
	public static readonly equivalentZoneCount = 10;
	public static readonly shelfEquivalentZoneCount = 7;
	public static readonly shelfEquivalentZones = [0, 2, 3, 4, 6, 8, 9];

	public static encodeCurve(curve: Int32Array): string {
		const min = GraphicalFilterEditor.minimumChannelValueY,
			range = GraphicalFilterEditor.validYRangeHeight,
			length = curve.length,
			array: number[] = new Array(length << 1);
		let actualLength = 0;
		for (let i = 0; i < length; i++) {
			let v = curve[i];
			v = ((v > min) ? 0 : (range - v));
			if (v <= 254) {
				array[actualLength++] = v;
			} else {
				array[actualLength++] = 255;
				array[actualLength++] = v - 254;
			}
		}
		array.splice(actualLength);
		return btoa(String.fromCharCode(...array));
	}

	public static decodeCurve(str?: string | null): number[] | null {
		if (!str || str.length < (GraphicalFilterEditor.visibleBinCount * 4 / 3))
			return null;
		try {
			str = atob(str);
		} catch (ex) {
			return null;
		}
		if (str.length < GraphicalFilterEditor.visibleBinCount)
			return null;
		const range = GraphicalFilterEditor.validYRangeHeight,
			length = str.length,
			array: number[] = new Array(GraphicalFilterEditor.visibleBinCount);
		let actualLength = 0;
		for (let i = 0; i < length; i++) {
			const v = str.charCodeAt(i);
			if (v <= 254) {
				array[actualLength++] = range - v;
			} else if (i < length - 1) {
				i++;
				array[actualLength++] = range - (str.charCodeAt(i) + 254);
			}
		}
		return array;
	}

	private editorPtr: number;
	private filterLength: number;
	private _sampleRate: number;
	private _isNormalized: boolean;
	private _iirType: GraphicalFilterEditorIIRType;
	private binCount: number;
	private audioContext: AudioContext;
	private filterKernel: AudioBuffer;
	private _convolver: ConvolverNode | null;
	private biquadFilters: AudioNode[] | null;
	private biquadFilterInput: AudioNode | null;
	private biquadFilterOutput: AudioNode | null;
	private biquadFilterGains: number[] | null;
	private biquadFilterActualGains: number[] | null;
	private biquadFilterActualFrequencies: Float32Array | null;
	private biquadFilterActualAccum: Float32Array | null;
	private biquadFilterActualMag: Float32Array | null;
	private biquadFilterActualPhase: Float32Array | null;
	private curveSnapshot: Int32Array | null;

	private readonly filterKernelBuffer: Float32Array;
	public readonly iirSupported: boolean;
	public readonly channelCurves: Int32Array[];
	public readonly actualChannelCurve: Int32Array;
	public readonly visibleFrequencies: Float64Array;
	public readonly equivalentZones: Int32Array;
	public readonly equivalentZonesFrequencyCount: Int32Array;

	public filterChangedCallback: FilterChangedCallback | null | undefined;

	public constructor(filterLength: number, audioContext: AudioContext, filterChangedCallback?: FilterChangedCallback | null, _iirType?: GraphicalFilterEditorIIRType) {
		super(filterChangedCallback);

		if (filterLength < 8 || (filterLength & (filterLength - 1)))
			throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";

		this.filterLength = filterLength;
		this._sampleRate = (audioContext.sampleRate ? audioContext.sampleRate : 44100);
		this._isNormalized = false;
		this.iirSupported = (("createBiquadFilter" in audioContext) && ("createIIRFilter" in audioContext));
		this._iirType = (this.iirSupported && _iirType) || GraphicalFilterEditorIIRType.None;
		this.binCount = (filterLength >>> 1) + 1;
		this.filterKernel = audioContext.createBuffer(2, filterLength, this._sampleRate);
		this.audioContext = audioContext;

		this.editorPtr = cLib._graphicalFilterEditorAlloc(this.filterLength, this._sampleRate);

		const buffer = cLib.HEAP8.buffer as ArrayBuffer;

		this.filterKernelBuffer = new Float32Array(buffer, cLib._graphicalFilterEditorGetFilterKernelBuffer(this.editorPtr), GraphicalFilterEditor.maximumFilterLength);
		this.channelCurves = [
			new Int32Array(buffer, cLib._graphicalFilterEditorGetChannelCurve(this.editorPtr, 0), GraphicalFilterEditor.visibleBinCount),
			new Int32Array(buffer, cLib._graphicalFilterEditorGetChannelCurve(this.editorPtr, 1), GraphicalFilterEditor.visibleBinCount)
		];
		this.actualChannelCurve = new Int32Array(buffer, cLib._graphicalFilterEditorGetActualChannelCurve(this.editorPtr), GraphicalFilterEditor.visibleBinCount);
		this.visibleFrequencies = new Float64Array(buffer, cLib._graphicalFilterEditorGetVisibleFrequencies(this.editorPtr), GraphicalFilterEditor.visibleBinCount);
		this.equivalentZones = new Int32Array(buffer, cLib._graphicalFilterEditorGetEquivalentZones(this.editorPtr), GraphicalFilterEditor.equivalentZoneCount);
		this.equivalentZonesFrequencyCount = new Int32Array(buffer, cLib._graphicalFilterEditorGetEquivalentZonesFrequencyCount(this.editorPtr), GraphicalFilterEditor.equivalentZoneCount + 1);

		this._convolver = null;
		this.biquadFilters = null;
		this.biquadFilterInput = null;
		this.biquadFilterOutput = null;
		this.biquadFilterGains = null;
		this.biquadFilterActualGains = null;
		this.biquadFilterActualFrequencies = null;
		this.biquadFilterActualAccum = null;
		this.biquadFilterActualMag = null;
		this.biquadFilterActualPhase = null;
		this.curveSnapshot = null;

		this.updateFilter(0, true, true);
		this.updateActualChannelCurve(0);
		this.updateBuffer();

		this.filterChangedCallback = filterChangedCallback;
	}

	public get sampleRate(): number {
		return this._sampleRate;
	}

	public get isNormalized(): boolean {
		return this._isNormalized;
	}

	public get iirType(): GraphicalFilterEditorIIRType {
		return this._iirType;
	}

	public get convolver(): ConvolverNode | null {
		return this._convolver;
	}

	public get inputNode(): AudioNode | null {
		return this.biquadFilterInput || this._convolver;
	}

	public get outputNode(): AudioNode | null {
		return this.biquadFilterOutput || this._convolver;
	}

	public destroy(): void {
		if (this.editorPtr) {
			super.destroy();
			cLib._graphicalFilterEditorFree(this.editorPtr);
			zeroObject(this);
		}
	}

	public clampX(x: number): number {
		return ((x <= 0) ? 0 :
			((x >= GraphicalFilterEditor.visibleBinCount) ? (GraphicalFilterEditor.visibleBinCount - 1) :
				x));
	}

	public clampY(y: number): number {
		return ((y <= GraphicalFilterEditor.maximumChannelValueY) ? GraphicalFilterEditor.maximumChannelValueY :
			((y > GraphicalFilterEditor.minimumChannelValueY) ? (GraphicalFilterEditor.validYRangeHeight + 1) :
				y));
	}

	public dBToMagnitude(dB: number): number {
		// 40dB = 100
		// -40dB = 0.01
		// magnitude = 10 ^ (dB/20)
		return Math.pow(10, dB / 20);
	}

	public yToDB(y: number): number {
		return ((y <= GraphicalFilterEditor.maximumChannelValueY) ? 40 :
			((y > GraphicalFilterEditor.minimumChannelValueY) ? -Infinity :
				lerp(GraphicalFilterEditor.maximumChannelValueY, 40, GraphicalFilterEditor.minimumChannelValueY, -40, y)));
	}

	public yToMagnitude(y: number): number {
		// 40dB = 100
		// -40dB = 0.01
		// magnitude = 10 ^ (dB/20)
		// log a (x^p) = p * log a (x)
		// x^p = a ^ (p * log a (x))
		// 10^p = e ^ (p * log e (10))
		return ((y <= GraphicalFilterEditor.maximumChannelValueY) ? 100 :
			((y > GraphicalFilterEditor.minimumChannelValueY) ? 0 :
				Math.exp(lerp(GraphicalFilterEditor.maximumChannelValueY, 2, GraphicalFilterEditor.minimumChannelValueY, -2, y) * Math.LN10))); //2 = 40dB/20
	}

	public magnitudeToY(magnitude: number): number {
		// 40dB = 100
		// -40dB = 0.01 (we are using 0.009 due to float point errors)
		return ((magnitude >= 100) ? GraphicalFilterEditor.maximumChannelValueY :
			((magnitude < 0.009) ? (GraphicalFilterEditor.validYRangeHeight + 1) :
				Math.round((GraphicalFilterEditor.zeroChannelValueY - (GraphicalFilterEditor.zeroChannelValueY * Math.log(magnitude) / Math.LN10 * 0.5)) - 0.4)));
	}

	public visibleBinToZoneIndex(visibleBinIndex: number): number {
		if (visibleBinIndex >= (GraphicalFilterEditor.visibleBinCount - 1)) {
			return this.equivalentZones.length - 1;
		} else if (visibleBinIndex > 0) {
			const z = this.equivalentZonesFrequencyCount;
			for (let i = z.length - 1; i >= 0; i--) {
				if (visibleBinIndex >= z[i])
					return i;
			}
		}
		return 0;
	}

	public visibleBinToFrequency(visibleBinIndex: number, returnGroup: boolean): number | number[] {
		const ez = this.equivalentZones,
			vf = this.visibleFrequencies,
			vbc = GraphicalFilterEditor.visibleBinCount;
		if (visibleBinIndex >= (vbc - 1)) {
			return (returnGroup ? [vf[vbc - 1], ez[ez.length - 1]] : vf[vbc - 1]);
		} else if (visibleBinIndex > 0) {
			if (returnGroup) {
				const ezc = this.equivalentZonesFrequencyCount;
				for (let i = ezc.length - 1; i >= 0; i--) {
					if (visibleBinIndex >= ezc[i])
						return [vf[visibleBinIndex], ez[i]];
				}
			} else {
				return vf[visibleBinIndex];
			}
		}
		return (returnGroup ? [vf[0], ez[0]] : vf[0]);
	}

	public getZoneY(channelIndex: number, zoneIndex: number): number {
		if (zoneIndex < 0)
			zoneIndex = 0;
		else if (zoneIndex >= this.equivalentZones.length)
			zoneIndex = this.equivalentZones.length - 1;
		return this.channelCurves[channelIndex][this.equivalentZonesFrequencyCount[zoneIndex]];
	}

	public changeZoneY(channelIndex: number, x: number, y: number): void {
		let i = this.visibleBinToZoneIndex(x);
		const ii = this.equivalentZonesFrequencyCount[i + 1],
			cy = this.clampY(y),
			curve = this.channelCurves[channelIndex];
		for (i = this.equivalentZonesFrequencyCount[i]; i < ii; i++)
			curve[i] = cy;
	}

	public changeZoneYByIndex(channelIndex: number, zoneIndex: number, y: number): void {
		if (zoneIndex < 0)
			zoneIndex = 0;
		else if (zoneIndex >= this.equivalentZones.length)
			zoneIndex = this.equivalentZones.length - 1;
		const ii = this.equivalentZonesFrequencyCount[zoneIndex + 1],
			cy = this.clampY(y),
			curve = this.channelCurves[channelIndex];
		for (let i = this.equivalentZonesFrequencyCount[zoneIndex]; i < ii; i++)
			curve[i] = cy;
	}

	private changeShelfZoneYByRegularIndex(channelIndex: number, zoneIndex: number, y: number): void {
		switch (zoneIndex) {
			case 0:
			case 1:
				this.changeZoneYByIndex(channelIndex, 0, y);
				this.changeZoneYByIndex(channelIndex, 1, y);
				break;
			case 4:
			case 5:
				this.changeZoneYByIndex(channelIndex, 4, y);
				this.changeZoneYByIndex(channelIndex, 5, y);
				break;
			case 6:
			case 7:
				this.changeZoneYByIndex(channelIndex, 6, y);
				this.changeZoneYByIndex(channelIndex, 7, y);
				break;
			default:
				this.changeZoneYByIndex(channelIndex, zoneIndex, y);
				break;
		}
	}

	public getShelfZoneY(channelIndex: number, shelfZoneIndex: number): number {
		if (shelfZoneIndex < 0)
			shelfZoneIndex = 0;
		else if (shelfZoneIndex >= GraphicalFilterEditor.shelfEquivalentZoneCount)
			shelfZoneIndex = GraphicalFilterEditor.shelfEquivalentZoneCount - 1;
		return this.channelCurves[channelIndex][this.equivalentZonesFrequencyCount[GraphicalFilterEditor.shelfEquivalentZones[shelfZoneIndex]]];
	}

	public changeShelfZoneY(channelIndex: number, x: number, y: number): void {
		this.changeShelfZoneYByRegularIndex(channelIndex, this.visibleBinToZoneIndex(x), y);
	}

	public changeShelfZoneYByIndex(channelIndex: number, shelfZoneIndex: number, y: number): void {
		if (shelfZoneIndex < 0)
			shelfZoneIndex = 0;
		else if (shelfZoneIndex >= GraphicalFilterEditor.shelfEquivalentZoneCount)
			shelfZoneIndex = GraphicalFilterEditor.shelfEquivalentZoneCount - 1;
		this.changeShelfZoneYByRegularIndex(channelIndex, GraphicalFilterEditor.shelfEquivalentZones[shelfZoneIndex], y);
	}

	public startSmoothEdition(channelIndex: number): void {
		if (!this.curveSnapshot)
			this.curveSnapshot = new Int32Array(GraphicalFilterEditor.visibleBinCount);
		this.curveSnapshot.set(this.channelCurves[channelIndex]);
	}

	public changeSmoothY(channelIndex: number, x: number, y: number, width: number): void {
		const curveSnapshot = this.curveSnapshot;
		if (!curveSnapshot)
			return;
		const count = GraphicalFilterEditor.visibleBinCount,
			cy = this.clampY(y),
			curve = this.channelCurves[channelIndex];
		curve.set(curveSnapshot);
		width >>= 1;
		for (let start = x - width, maxI = Math.min(x, count), i = Math.max(0, start); i < maxI; i++) {
			const s = (512 * smoothStep(start, x, i)) | 0;
			curve[i] = this.clampY(Math.round(((cy * s) + (curve[i] * (512 - s))) / 512));
		}
		for (let end = x + width, maxI = Math.min(end, count), i = Math.max(0, x); i < maxI; i++) {
			const s = (512 * smoothStep(end, x, i)) | 0;
			curve[i] = this.clampY(Math.round(((cy * s) + (curve[i] * (512 - s))) / 512));
		}
	}

	private updateBuffer(): void {
		const oldConvolver = this._convolver;
		if (!this._convolver) {
			this._convolver = this.audioContext.createConvolver();
			this._convolver.normalize = false;
		}
		// Even though this._convolver.buffer === this.filterKernel, changing
		// this.filterKernel's contents does not change the actual convolver
		// response. Apparently, as of march/2021, it is not necessary to create
		// a new convolver to force the changes to take effect. Just assigning
		// the audio buffer to this._convolver.buffer, even if it is the same
		// audio buffer, makes the convolver update its internal state.
		try {
			this._convolver.buffer = this.filterKernel;
		} catch (ex: any) {
			// Old Chrome versions do not allow non-null buffers to be set to another
			// non-null buffer
			this._convolver = this.audioContext.createConvolver();
			this._convolver.normalize = false;
			this._convolver.buffer = this.filterKernel;
		}
		if (oldConvolver !== this._convolver && this.filterChangedCallback)
			this.filterChangedCallback();
	}

	private copyToChannel(source: Float32Array, channelNumber: number): void {
		// Safari and Safari for iOS do no support AudioBuffer.copyToChannel()
		if (this.filterKernel["copyToChannel"]) {
			this.filterKernel.copyToChannel(source, channelNumber);
		} else {
			const dst = this.filterKernel.getChannelData(channelNumber);
			for (let i = (this.filterLength - 1); i >= 0; i--)
				dst[i] = source[i];	
		}
	}

	private copyFromChannel(destination: Float32Array, channelNumber: number): void {
		// Safari and Safari for iOS do no support AudioBuffer.copyFromChannel()
		if (this.filterKernel["copyToChannel"]) {
			this.filterKernel.copyFromChannel(destination, channelNumber);
		} else {
			const src = this.filterKernel.getChannelData(channelNumber);
			for (let i = (this.filterLength - 1); i >= 0; i--)
				destination[i] = src[i];	
		}
	}

	public copyFilter(sourceChannel: number, destinationChannel: number): void {
		this.copyToChannel(this.filterKernel.getChannelData(sourceChannel), destinationChannel);
		this.updateBuffer();
	}

	public updateFilter(channelIndex: number, isSameFilterLR: boolean, updateBothChannels: boolean): void {
		switch (this._iirType) {
			case GraphicalFilterEditorIIRType.Peaking:
				this.updatePeakingEq(channelIndex);
				return;
			case GraphicalFilterEditorIIRType.Shelf:
				this.updateShelfEq(channelIndex);
				return;
		}

		cLib._graphicalFilterEditorUpdateFilter(this.editorPtr, channelIndex, this._isNormalized);
		this.copyToChannel(this.filterKernelBuffer, channelIndex);

		if (isSameFilterLR) {
			// Copy the filter to the other channel
			this.copyFilter(channelIndex, 1 - channelIndex);
		} else if (updateBothChannels) {
			// Update the other channel as well
			this.updateFilter(1 - channelIndex, false, false);
		} else {
			this.updateBuffer();
		}
	}

	public updateActualChannelCurve(channelIndex: number): void {
		if (this._iirType) {
			this.updateActualChannelCurveIIR();
			return;
		}

		this.copyFromChannel(this.filterKernelBuffer, channelIndex);
		cLib._graphicalFilterEditorUpdateActualChannelCurve(this.editorPtr, channelIndex);
	}

	public updatePeakingEq(channelIndex: number): void {
		const audioContext = this.audioContext,
			curve = this.channelCurves[channelIndex],
			equivalentZones = this.equivalentZones,
			equivalentZonesFrequencyCount = this.equivalentZonesFrequencyCount,
			equivalentZoneCount = GraphicalFilterEditor.equivalentZoneCount;

		let biquadFilters = this.biquadFilters,
			biquadFilterGains = this.biquadFilterGains,
			connectionsChanged = false;

		if (!biquadFilters || !biquadFilterGains) {
			connectionsChanged = true;

			biquadFilters = new Array(equivalentZoneCount);
			biquadFilterGains = new Array(equivalentZoneCount);

			const q = new Array(equivalentZoneCount),
				ln2_2 = Math.log(2) * 0.5,
				fs = this.audioContext.sampleRate,
				_2pi = 2 * Math.PI;

			for (let i = equivalentZoneCount - 1; i >= 0; i--) {
				const w0 = _2pi * equivalentZones[i] / fs;
				q[i] = 1 / (2 * Math.sinh(ln2_2 * (w0 / Math.sin(w0))));
			}

			for (let i = equivalentZoneCount - 1; i >= 0; i--) {
				const biquadFilter = audioContext.createBiquadFilter();
				biquadFilter.type = "peaking";
				biquadFilter.frequency.value = equivalentZones[i];
				biquadFilter.Q.value = q[i];
				biquadFilters[i] = biquadFilter;
				if (i < (equivalentZoneCount - 1))
					biquadFilters[i + 1].connect(biquadFilters[i]);
			}

			this.biquadFilters = biquadFilters;
			this.biquadFilterInput = biquadFilters[equivalentZoneCount - 1];
			this.biquadFilterOutput = biquadFilters[0];
		}

		for (let i = equivalentZoneCount - 1; i >= 0; i--)
			biquadFilterGains[i] = Math.max(-40, this.yToDB(curve[equivalentZonesFrequencyCount[i]]));

		const bandCorrelation = -0.15;
		for (let i = equivalentZoneCount - 1; i >= 0; i--)
			(biquadFilters[i] as BiquadFilterNode).gain.value = biquadFilterGains[i] +
				(i < (equivalentZoneCount - 1) ? (biquadFilterGains[i + 1] * bandCorrelation) : 0) +
				(i > 0 ? (biquadFilterGains[i - 1] * bandCorrelation) : 0);

		if (connectionsChanged && this.filterChangedCallback)
			this.filterChangedCallback();
	}

	public updateShelfEq(channelIndex: number): void {
		const audioContext = this.audioContext,
			curve = this.channelCurves[channelIndex],
			equivalentZonesFrequencyCount = this.equivalentZonesFrequencyCount,
			shelfEquivalentZoneCount = GraphicalFilterEditor.shelfEquivalentZoneCount,
			shelfEquivalentZones = GraphicalFilterEditor.shelfEquivalentZones;

		let biquadFilters = this.biquadFilters,
			biquadFilterGains = this.biquadFilterGains,
			biquadFilterActualGains = this.biquadFilterActualGains;

		if (!biquadFilters || !biquadFilterGains || !biquadFilterActualGains) {
			biquadFilters = new Array(shelfEquivalentZoneCount);
			biquadFilterGains = new Array(shelfEquivalentZoneCount);
			biquadFilterActualGains = new Array(shelfEquivalentZoneCount);

			this.biquadFilters = biquadFilters;
			this.biquadFilterGains = biquadFilterGains;
			this.biquadFilterActualGains = biquadFilterActualGains;

			biquadFilters[shelfEquivalentZoneCount - 1] = audioContext.createGain();
			this.biquadFilterInput = biquadFilters[shelfEquivalentZoneCount - 1];
		}

		for (let i = shelfEquivalentZoneCount - 1; i >= 0; i--)
			biquadFilterGains[i] = Math.max(-40, this.yToDB(curve[equivalentZonesFrequencyCount[shelfEquivalentZones[i]]]));

		// Taken from my other project: FPlayAndroid
		// https://github.com/carlosrafaelgn/FPlayAndroid/blob/master/jni/x/Effects.h
		const lastBand = shelfEquivalentZoneCount - 1;
		let leftover = 0,
			lastValidFilter = lastBand,
			lastFilterHasChanged = false,
			biquadFilterOutput = biquadFilters[lastBand];

		(biquadFilterOutput as GainNode).gain.value = this.dBToMagnitude(biquadFilterGains[lastBand]);

		for (let i = lastBand - 1; i >= 0; i--) {
			let gain = leftover + (biquadFilterGains[i] - biquadFilterGains[i + 1]);

			// Beyond +-22.87dB the filter yields NaN unless we use any other formula that produces ripple
			if (gain < -22) {
				leftover = gain + 22;
				gain = -22;
			} else if (gain > 22) {
				leftover = gain - 22;
				gain = 22;
			} else {
				leftover = 0;
			}

			if (biquadFilterActualGains[i] !== gain) {
				lastFilterHasChanged = true;

				biquadFilterActualGains[i] = gain;
				if (biquadFilters[i])
					biquadFilters[i].disconnect();
				
				biquadFilterOutput.disconnect();

				if (gain) {
					biquadFilters[i] = this.createIIRFilter(i, gain);
					biquadFilterOutput.connect(biquadFilters[i]);
					biquadFilterOutput = biquadFilters[i];
				} else {
					biquadFilters[i] = null as any;
				}
			} else if (biquadFilters[i]) {
				if (lastFilterHasChanged) {
					lastFilterHasChanged = false;
					biquadFilterOutput.connect(biquadFilters[i]);
				}
				biquadFilterOutput = biquadFilters[i];
			}
		}

		if (this.biquadFilterOutput !== biquadFilterOutput) {
			this.biquadFilterOutput = biquadFilterOutput;
			if (this.filterChangedCallback)
				this.filterChangedCallback();
		}
	}

	// Taken from my other project: FPlayAndroid
	// https://github.com/carlosrafaelgn/FPlayAndroid/blob/master/jni/x/Effects.h
	private createIIRFilter(band: number, gain: number): IIRFilterNode {
		const audioContext = this.audioContext;

		// The idea for this equalizer is simple/trick ;)
		//
		// band Max-1 is an ordinary gain, corresponding to its gain + pre amp
		// band Max-2 is a lowshelf filter, applying a gain corresponding to this delta: Band Max-2's gain - Band Max-1's gain
		// ...
		// band 0 is a lowshelf filter, applying a gain corresponding to this delta: Band 0's gain - Band 1's gain

		// The method used to compute b0, b1, b2, a1 and a2 was created
		// by Robert Bristow-Johnson (extracted from his Audio-EQ-Cookbook.txt)
		//
		// Cookbook formulae for audio EQ biquad filter coefficients
		// by Robert Bristow-Johnson  <rbj@audioimagination.com>
		//
		// Links:
		// https://webaudio.github.io/Audio-EQ-Cookbook/audio-eq-cookbook.html
		// https://webaudio.github.io/Audio-EQ-Cookbook/Audio-EQ-Cookbook.txt
		// http://www.earlevel.com/main/2010/12/20/biquad-calculator/
		//
		// These are the original/old links, but they all appear to be gone now!
		// http://www.musicdsp.org/archive.php?classid=3#197
		// http://www.musicdsp.org/archive.php?classid=3#198
		// http://www.musicdsp.org/files/Audio-EQ-Cookbook.txt
		// http://www.musicdsp.org/files/EQ-Coefficients.pdf
		//
		// Begin with these user defined parameters:
		//
		// Fs (the sampling frequency)
		//
		// f0 ("wherever it's happenin', man."  Center Frequency or
		//   Corner Frequency, or shelf midpoint frequency, depending
		//   on which filter type.  The "significant frequency".)
		//
		// dBgain (used only for peaking and shelving filters)
		//
		// Q or BW or S (only one must be chosen)
		// Q (the EE kind of definition, except for peakingEQ in which A*Q is
		//   the classic EE Q.  That adjustment in definition was made so that
		//   a boost of N dB followed by a cut of N dB for identical Q and
		//   f0/Fs results in a precisely flat unity gain filter or "wire".)
		//
		// BW, the bandwidth in octaves (between -3 dB frequencies for BPF
		//   and notch or between midpoint (dBgain/2) gain frequencies for
		//   peaking EQ)
		//
		// S, a "shelf slope" parameter (for shelving EQ only).  When S = 1,
		//   the shelf slope is as steep as it can be and remain monotonically
		//   increasing or decreasing gain with frequency.  The shelf slope, in
		//   dB/octave, remains proportional to S for all other values for a
		//   fixed f0/Fs and dBgain.
		//
		// Then compute a few intermediate variables:
		//
		// A  = sqrt( 10^(dBgain/20) )
		//    =	   10^(dBgain/40)	 (for peaking and shelving EQ filters only)
		//
		// w0 = 2*pi*f0/Fs
		//
		// cos(w0)
		// sin(w0)
		//
		// alpha = sin(w0)/(2*Q)                               (case: Q)
		//       = sin(w0)*sinh( ln(2)/2 * BW * w0/sin(w0) )   (case: BW)
		//       = sin(w0)/2 * sqrt( (A + 1/A)*(1/S - 1) + 2 ) (case: S)

		const Fs = audioContext.sampleRate;
		let f0: number;
		switch (band) {
		case 0: // 31.25 Hz / 62.5 Hz
			f0 = 92.75;
			break;
		case 1: // 125 Hz
			f0 = 187.5;
			break;
		case 2: // 250 Hz
			f0 = 375.0;
			break;
		case 3: // 500 Hz / 1000 Hz
			f0 = 1500.0;
			break;
		case 4: // 2000 Hz / 4000 Hz
			f0 = 6000.0;
			break;
		default: // 8000 Hz
			f0 = 12000.0;
			break;
		}

		const PI = 3.1415926535897932384626433832795;
		const S = 2.0;
		const A = Math.pow(10.0, gain / 40.0);
		const w0 = 2.0 * PI * f0 / Fs;
		const cosw0 = Math.cos(w0);
		const sinw0 = Math.sin(w0);

		// alpha = sin(w0)/2 * sqrt( (A + 1/A)*(1/S - 1) + 2 )
		// S used to be assumed as 1, resulting in
		// alpha = sin(w0)/2 * sqrt( (A + 1/A)*(1/1 - 1) + 2 )
		// alpha = sin(w0)/2 * sqrt(2)
		// alpha = sin(w0) * 0.70710678118654752440084436210485
		// but that yielded a very subtle slope... therefore, we are now
		// using S = 2, making the slope more aggressive

		const alpha = sinw0 * 0.5 * Math.sqrt((A + (1.0 / A)) * ((1.0 / S) - 1.0) + 2.0);

		const two_sqrtA_alpha = 2.0 * Math.sqrt(A) * alpha;

		const b0 =     A*( (A+1.0) - ((A-1.0)*cosw0) + two_sqrtA_alpha );
		const b1 = 2.0*A*( (A-1.0) - ((A+1.0)*cosw0)                   );
		const b2 =     A*( (A+1.0) - ((A-1.0)*cosw0) - two_sqrtA_alpha );
		const a0 =         (A+1.0) + ((A-1.0)*cosw0) + two_sqrtA_alpha;
		const a1 =  -2.0*( (A-1.0) + ((A+1.0)*cosw0)                   );
		const a2 =         (A+1.0) + ((A-1.0)*cosw0) - two_sqrtA_alpha;

		return audioContext.createIIRFilter([b0, b1, b2], [a0, a1, a2]);
	}

	public updateActualChannelCurveIIR(): void {
		const biquadFilters = this.biquadFilters;

		if (!biquadFilters)
			return;

		let biquadFilterActualFrequencies = this.biquadFilterActualFrequencies,
			biquadFilterActualAccum = this.biquadFilterActualAccum,
			biquadFilterActualMag = this.biquadFilterActualMag,
			biquadFilterActualPhase = this.biquadFilterActualPhase;

		if (!biquadFilterActualFrequencies || !biquadFilterActualAccum || !biquadFilterActualMag || !biquadFilterActualPhase) {
			const visibleFrequencies = this.visibleFrequencies;
			biquadFilterActualFrequencies = new Float32Array(visibleFrequencies.length);
			for (let i = visibleFrequencies.length - 1; i >= 0; i--)
				biquadFilterActualFrequencies[i] = visibleFrequencies[i];
			biquadFilterActualAccum = new Float32Array(visibleFrequencies.length);
			biquadFilterActualMag = new Float32Array(visibleFrequencies.length);
			biquadFilterActualPhase = new Float32Array(visibleFrequencies.length);
			this.biquadFilterActualFrequencies = biquadFilterActualFrequencies;
			this.biquadFilterActualAccum = biquadFilterActualAccum;
			this.biquadFilterActualMag = biquadFilterActualMag;
			this.biquadFilterActualPhase = biquadFilterActualPhase;
		}

		const length = biquadFilterActualFrequencies.length;

		// Both BiquadFilterNode and IIRFilterNode have getFrequencyResponse(), so let's just
		// pretend all filters are BiquadFilterNode's for the sake of simplicity
		if (this._iirType === GraphicalFilterEditorIIRType.Shelf) {
			biquadFilterActualAccum.fill((biquadFilters[biquadFilters.length - 1] as GainNode).gain.value);
		} else {
			(biquadFilters[biquadFilters.length - 1] as BiquadFilterNode).getFrequencyResponse(biquadFilterActualFrequencies, biquadFilterActualAccum, biquadFilterActualPhase);
			// Just to avoid the last few NaN pixels on devices with a sample rate of 44100Hz or lower
			let i = length - 1, lastMag = 1;
			while (i >= 0 && isNaN(lastMag = biquadFilterActualAccum[i]))
				i--;
			i++;
			while (i < length)
				biquadFilterActualAccum[i++] = lastMag;
		}

		for (let i = biquadFilters.length - 2; i >= 0; i--) {
			// When using GraphicalFilterEditorIIRType.Shelf, a few biquadFilters could be null
			if (!biquadFilters[i])
				continue;
			(biquadFilters[i] as BiquadFilterNode).getFrequencyResponse(biquadFilterActualFrequencies, biquadFilterActualMag, biquadFilterActualPhase);
			for (let j = 0, lastMag = 0; j < length; j++) {
				// Just to avoid the last few NaN pixels on devices with a sample rate of 44100Hz or lower
				const mag = biquadFilterActualMag[j];
				if (!isNaN(mag))
					lastMag = mag;
				biquadFilterActualAccum[j] *= lastMag;
			}
		}

		const curve = this.actualChannelCurve,
			magnitudeToY = this.magnitudeToY;

		for (let i = curve.length - 1; i >= 0; i--)
			curve[i] = magnitudeToY(biquadFilterActualAccum[i]);
	}

	public changeFilterLength(newFilterLength: number, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (this.filterLength !== newFilterLength) {
			this.filterLength = newFilterLength;
			this.binCount = (newFilterLength >>> 1) + 1;
			this.filterKernel = this.audioContext.createBuffer(2, newFilterLength, this._sampleRate);
			cLib._graphicalFilterEditorChangeFilterLength(this.editorPtr, newFilterLength);
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	}

	public changeSampleRate(newSampleRate: number, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (this._sampleRate !== newSampleRate) {
			this._sampleRate = newSampleRate;
			this.filterKernel = this.audioContext.createBuffer(2, this.filterLength, newSampleRate);
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	}

	public changeIsNormalized(isNormalized: boolean, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (!this._isNormalized !== !isNormalized) {
			this._isNormalized = !!isNormalized;
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	}

	public changeIIRType(iirType: GraphicalFilterEditorIIRType, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (this._iirType !== iirType && this.iirSupported) {
			this._iirType = iirType;
			this.disconnectOutputFromDestination();
			this._convolver = null;
			const biquadFilters = this.biquadFilters;
			if (biquadFilters) {
				for (let i = biquadFilters.length - 1; i >= 0; i--) {
					if (biquadFilters[i])
						biquadFilters[i].disconnect();
				}
				biquadFilters.fill(null as any);
				this.biquadFilters = null;
			}
			this.biquadFilterInput = null;
			this.biquadFilterOutput = null;
			this.biquadFilterGains = null;
			this.biquadFilterActualFrequencies = null;
			this.biquadFilterActualAccum = null;
			this.biquadFilterActualMag = null;
			this.biquadFilterActualPhase = null;
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	}

	public changeAudioContext(newAudioContext: AudioContext, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (this.audioContext !== newAudioContext) {
			this.disconnectOutputFromDestination();
			this._convolver = null;
			const biquadFilters = this.biquadFilters;
			if (biquadFilters) {
				for (let i = biquadFilters.length - 1; i >= 0; i--) {
					if (biquadFilters[i])
						biquadFilters[i].disconnect();
				}
				biquadFilters.fill(null as any);
				this.biquadFilters = null;
			}
			this.biquadFilterInput = null;
			this.biquadFilterOutput = null;
			this.biquadFilterGains = null;
			this.biquadFilterActualFrequencies = null;
			this.biquadFilterActualAccum = null;
			this.biquadFilterActualMag = null;
			this.biquadFilterActualPhase = null;
			this.audioContext = newAudioContext;
			this._sampleRate = (newAudioContext.sampleRate ? newAudioContext.sampleRate : 44100);
			this.filterKernel = newAudioContext.createBuffer(2, this.filterLength, this._sampleRate);
			this.updateFilter(channelIndex, isSameFilterLR, true);
			this.updateBuffer();
			return true;
		}
		return false;
	}
}
