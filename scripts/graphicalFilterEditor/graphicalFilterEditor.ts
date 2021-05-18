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

class GraphicalFilterEditor {
	// Must be in sync with c/common.h
	// Sorry, but due to the frequency mapping I created, this class will only work with
	// 500 visible bins... in order to change this, a new frequency mapping must be created...
	public static readonly VisibleBinCount = 500;
	public static readonly ValidYRangeHeight = 321;
	public static readonly ZeroChannelValueY = GraphicalFilterEditor.ValidYRangeHeight >>> 1;
	public static readonly MaximumChannelValue = GraphicalFilterEditor.ZeroChannelValueY;
	public static readonly MinimumChannelValue = -GraphicalFilterEditor.ZeroChannelValueY;
	public static readonly MinusInfiniteChannelValue = GraphicalFilterEditor.MinimumChannelValue - 1;
	public static readonly MaximumChannelValueY = 0;
	public static readonly MinimumChannelValueY = GraphicalFilterEditor.ValidYRangeHeight - 1;
	public static readonly MaximumFilterLength = 8192;
	public static readonly EquivalentZoneCount = 10;

	public static encodeCurve(curve: Int32Array): string {
		const min = GraphicalFilterEditor.MinimumChannelValueY,
			range = GraphicalFilterEditor.ValidYRangeHeight,
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
		if (!str || str.length < (GraphicalFilterEditor.VisibleBinCount * 4 / 3))
			return null;
		try {
			str = atob(str);
		} catch (ex) {
			return null;
		}
		if (str.length < GraphicalFilterEditor.VisibleBinCount)
			return null;
		const range = GraphicalFilterEditor.ValidYRangeHeight,
			length = str.length,
			array: number[] = new Array(GraphicalFilterEditor.VisibleBinCount);
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
	private _isPeakingEq: boolean;
	private binCount: number;
	private audioContext: AudioContext;
	private filterKernel: AudioBuffer;
	private _convolver: ConvolverNode | null;
	private biquadFilters: BiquadFilterNode[] | null;
	private biquadFilterInput: AudioNode | null;
	private biquadFilterOutput: AudioNode | null;
	private biquadFilterGains: number[] | null;
	private biquadFilterActualFrequencies: Float32Array | null;
	private biquadFilterActualAccum: Float32Array | null;
	private biquadFilterActualMag: Float32Array | null;
	private biquadFilterActualPhase: Float32Array | null;
	private filterChangedCallback: FilterChangedCallback | null | undefined;
	private curveSnapshot: Int32Array | null;

	private readonly filterKernelBuffer: Float32Array;
	public readonly channelCurves: Int32Array[];
	public readonly actualChannelCurve: Int32Array;
	public readonly visibleFrequencies: Int32Array;
	public readonly equivalentZones: Int32Array;
	public readonly equivalentZonesFrequencyCount: Int32Array;

	public constructor(filterLength: number, audioContext: AudioContext, filterChangedCallback?: FilterChangedCallback | null, isPeakingEq?: boolean) {
		if (filterLength < 8 || (filterLength & (filterLength - 1)))
			throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";

		this.filterLength = filterLength;
		this._sampleRate = (audioContext.sampleRate ? audioContext.sampleRate : 44100);
		this._isNormalized = false;
		this._isPeakingEq = !!isPeakingEq;
		this.binCount = (filterLength >>> 1) + 1;
		this.filterKernel = audioContext.createBuffer(2, filterLength, this._sampleRate);
		this.audioContext = audioContext;

		this.editorPtr = cLib._graphicalFilterEditorAlloc(this.filterLength, this._sampleRate);

		const buffer = cLib.HEAP8.buffer as ArrayBuffer;

		this.filterKernelBuffer = new Float32Array(buffer, cLib._graphicalFilterEditorGetFilterKernelBuffer(this.editorPtr), GraphicalFilterEditor.MaximumFilterLength);
		this.channelCurves = [
			new Int32Array(buffer, cLib._graphicalFilterEditorGetChannelCurve(this.editorPtr, 0), GraphicalFilterEditor.VisibleBinCount),
			new Int32Array(buffer, cLib._graphicalFilterEditorGetChannelCurve(this.editorPtr, 1), GraphicalFilterEditor.VisibleBinCount)
		];
		this.actualChannelCurve = new Int32Array(buffer, cLib._graphicalFilterEditorGetActualChannelCurve(this.editorPtr), GraphicalFilterEditor.VisibleBinCount);
		this.visibleFrequencies = new Int32Array(buffer, cLib._graphicalFilterEditorGetVisibleFrequencies(this.editorPtr), GraphicalFilterEditor.VisibleBinCount);
		this.equivalentZones = new Int32Array(buffer, cLib._graphicalFilterEditorGetEquivalentZones(this.editorPtr), GraphicalFilterEditor.EquivalentZoneCount);
		this.equivalentZonesFrequencyCount = new Int32Array(buffer, cLib._graphicalFilterEditorGetEquivalentZonesFrequencyCount(this.editorPtr), GraphicalFilterEditor.EquivalentZoneCount + 1);

		this._convolver = null;
		this.biquadFilters = null;
		this.biquadFilterInput = null;
		this.biquadFilterOutput = null;
		this.biquadFilterGains = null;
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

	public get isPeakingEq(): boolean {
		return this._isPeakingEq;
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

	public connectSourceAndDestination(source: AudioNode | null, destination: AudioNode | null): boolean {
		const s = this.connectSourceToInput(source);
		return this.connectOutputToDestination(destination) && s;
	}

	public connectSourceToInput(source: AudioNode | null): boolean {
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
		if (this.outputNode) {
			this.outputNode.disconnect();
			if (destination)
				this.outputNode.connect(destination, 0, 0);
			return true;
		}
		return false;
	}

	public disconnectOutputFromDestination(): boolean {
		const outputNode = this.outputNode;
		if (this.outputNode) {
			this.outputNode.disconnect();
			return true;
		}
		return false;
	}

	public destroy(): void {
		if (this.editorPtr) {
			this.disconnectOutputFromDestination();
			cLib._graphicalFilterEditorFree(this.editorPtr);
			zeroObject(this);
		}
	}

	public clampX(x: number): number {
		return ((x <= 0) ? 0 :
			((x >= GraphicalFilterEditor.VisibleBinCount) ? (GraphicalFilterEditor.VisibleBinCount - 1) :
				x));
	}

	public clampY(y: number): number {
		return ((y <= GraphicalFilterEditor.MaximumChannelValueY) ? GraphicalFilterEditor.MaximumChannelValueY :
			((y > GraphicalFilterEditor.MinimumChannelValueY) ? (GraphicalFilterEditor.ValidYRangeHeight + 1) :
				y));
	}

	public yToDB(y: number): number {
		return ((y <= GraphicalFilterEditor.MaximumChannelValueY) ? 40 :
			((y > GraphicalFilterEditor.MinimumChannelValueY) ? -Infinity :
				lerp(GraphicalFilterEditor.MaximumChannelValueY, 40, GraphicalFilterEditor.MinimumChannelValueY, -40, y)));
	}

	public yToMagnitude(y: number): number {
		// 40dB = 100
		// -40dB = 0.01
		// magnitude = 10 ^ (dB/20)
		// log a (x^p) = p * log a (x)
		// x^p = a ^ (p * log a (x))
		// 10^p = e ^ (p * log e (10))
		return ((y <= GraphicalFilterEditor.MaximumChannelValueY) ? 100 :
			((y > GraphicalFilterEditor.MinimumChannelValueY) ? 0 :
				Math.exp(lerp(GraphicalFilterEditor.MaximumChannelValueY, 2, GraphicalFilterEditor.MinimumChannelValueY, -2, y) * Math.LN10))); //2 = 40dB/20
	}

	public magnitudeToY(magnitude: number): number {
		// 40dB = 100
		// -40dB = 0.01 (we are using 0.009 due to float point errors)
		return ((magnitude >= 100) ? GraphicalFilterEditor.MaximumChannelValueY :
			((magnitude < 0.009) ? (GraphicalFilterEditor.ValidYRangeHeight + 1) :
				Math.round((GraphicalFilterEditor.ZeroChannelValueY - (GraphicalFilterEditor.ZeroChannelValueY * Math.log(magnitude) / Math.LN10 * 0.5)) - 0.4)));
	}

	public visibleBinToZoneIndex(visibleBinIndex: number): number {
		if (visibleBinIndex >= (GraphicalFilterEditor.VisibleBinCount - 1)) {
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
			vbc = GraphicalFilterEditor.VisibleBinCount;
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

	public changeZoneY(channelIndex: number, x: number, y: number): void {
		let i = this.visibleBinToZoneIndex(x);
		const ii = this.equivalentZonesFrequencyCount[i + 1],
			cy = this.clampY(y),
			curve = this.channelCurves[channelIndex];
		for (i = this.equivalentZonesFrequencyCount[i]; i < ii; i++)
			curve[i] = cy;
	}

	public startSmoothEdition(channelIndex: number): void {
		if (!this.curveSnapshot)
			this.curveSnapshot = new Int32Array(GraphicalFilterEditor.VisibleBinCount);
		this.curveSnapshot.set(this.channelCurves[channelIndex]);
	}

	public changeSmoothY(channelIndex: number, x: number, y: number, width: number): void {
		const curveSnapshot = this.curveSnapshot;
		if (!curveSnapshot)
			return;
		const count = GraphicalFilterEditor.VisibleBinCount,
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
		this._convolver.buffer = this.filterKernel;
		if (!oldConvolver && this.filterChangedCallback)
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
		if (this._isPeakingEq) {
			this.updatePeakingEq(channelIndex);
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
		if (this._isPeakingEq) {
			this.updateActualChannelCurvePeakingEq();
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
			equivalentZoneCount = GraphicalFilterEditor.EquivalentZoneCount;

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
			biquadFilters[i].gain.value = biquadFilterGains[i] +
				(i < (equivalentZoneCount - 1) ? (biquadFilterGains[i + 1] * bandCorrelation) : 0) +
				(i > 0 ? (biquadFilterGains[i - 1] * bandCorrelation) : 0);

		if (connectionsChanged && this.filterChangedCallback)
			this.filterChangedCallback();
	}

	public updateActualChannelCurvePeakingEq(): void {
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

		biquadFilterActualAccum.fill(1);

		const length = biquadFilterActualFrequencies.length;
		for (let i = biquadFilters.length - 1; i >= 0; i--) {
			(biquadFilters[i] as BiquadFilterNode).getFrequencyResponse(biquadFilterActualFrequencies, biquadFilterActualMag, biquadFilterActualPhase);
			let lastMag = 0;
			for (let j = 0; j < length; j++) {
				// Just to avoid the last few NaN pixels on devices with a sample rate of 44100Hz
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

	public changeIsPeakingEq(isPeakingEq: boolean, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (!this._isPeakingEq !== !isPeakingEq) {
			this._isPeakingEq = !!isPeakingEq;
			this.disconnectOutputFromDestination();
			if (isPeakingEq) {
				this._convolver = null;
			} else {
				const biquadFilters = this.biquadFilters;
				if (biquadFilters) {
					for (let i = biquadFilters.length - 1; i >= 0; i--)
						biquadFilters[i].disconnect();
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
			}
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
				for (let i = biquadFilters.length - 1; i >= 0; i--)
					biquadFilters[i].disconnect();
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
