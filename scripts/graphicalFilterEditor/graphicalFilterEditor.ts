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

interface ConvolverCallback {
	(oldConvolver: ConvolverNode | null, newConvolver: ConvolverNode): void;
}

class GraphicalFilterEditor {
	// Must be in sync with c/common.h
	// Sorry, but due to the frequency mapping I created, this class will only work with
	// 512 visible bins... in order to change this, a new frequency mapping must be created...
	public static readonly VisibleBinCount = 512;
	public static readonly ValidYRangeHeight = 255;
	public static readonly ZeroChannelValueY = 255 >>> 1;
	public static readonly MaximumChannelValue = 127;
	public static readonly MinimumChannelValue = -127;
	public static readonly MinusInfiniteChannelValue = -128;
	public static readonly MaximumChannelValueY = 0;
	public static readonly MinimumChannelValueY = 255 - 1;
	public static readonly MaximumFilterLength = 8192;
	public static readonly EquivalentZoneCount = 10;

	private editorPtr: number;
	private filterLength: number;
	private _sampleRate: number;
	private _isNormalized: boolean;
	private binCount: number;
	private audioContext: AudioContext;
	private filterKernel: AudioBuffer;
	private _convolver: ConvolverNode | null;
	private convolverCallback: ConvolverCallback;

	private readonly filterKernelBuffer: Float32Array;
	public readonly channelCurves: Int32Array[];
	public readonly actualChannelCurve: Int32Array;
	public readonly visibleFrequencies: Int32Array;
	public readonly equivalentZones: Int32Array;
	public readonly equivalentZonesFrequencyCount: Int32Array;

	public constructor(filterLength: number, audioContext: AudioContext, convolverCallback: ConvolverCallback) {
		if (filterLength < 8 || (filterLength & (filterLength - 1)))
			throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";

		this.filterLength = filterLength;
		this._sampleRate = (audioContext.sampleRate ? audioContext.sampleRate : 44100);
		this._isNormalized = false;
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

		this._convolver = audioContext.createConvolver();
		this._convolver.normalize = false;
		this.convolverCallback = convolverCallback;
		this._convolver.buffer = this.filterKernel;

		this.updateFilter(0, true, true);
		this.updateActualChannelCurve(0);
	}

	public get sampleRate(): number {
		return this._sampleRate;
	}

	public get isNormalized(): boolean {
		return this._isNormalized;
	}

	public get convolver(): ConvolverNode | null {
		return this._convolver;
	}

	public destroy() : void {
		if (this.editorPtr) {
			cLib._graphicalFilterEditorFree(this.editorPtr);
			zeroObject(this);
		}
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
		// -40dB = 0.01
		return ((magnitude >= 100) ? GraphicalFilterEditor.MaximumChannelValueY :
			((magnitude < 0.01) ? (GraphicalFilterEditor.ValidYRangeHeight + 1) :
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

	private updateBuffer(): void {
		if (this.convolverCallback) {
			const oldConvolver = this._convolver;
			this._convolver = this.audioContext.createConvolver();
			this._convolver.normalize = false;
			this._convolver.buffer = this.filterKernel;
			this.convolverCallback(oldConvolver, this._convolver);
		} else if (this._convolver) {
			this._convolver.buffer = this.filterKernel;
		}
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
		if (this._convolver)
			this.updateBuffer();
	}

	public updateFilter(channelIndex: number, isSameFilterLR: boolean, updateBothChannels: boolean): void {
		cLib._graphicalFilterEditorUpdateFilter(this.editorPtr, channelIndex, this._isNormalized);
		this.copyToChannel(this.filterKernelBuffer, channelIndex);

		if (isSameFilterLR) {
			// Copy the filter to the other channel
			this.copyFilter(channelIndex, 1 - channelIndex);
		} else if (updateBothChannels) {
			// Update the other channel as well
			this.updateFilter(1 - channelIndex, false, false);
		} else if (this._convolver) {
			this.updateBuffer();
		}
	}

	public updateActualChannelCurve(channelIndex: number): void {
		this.copyFromChannel(this.filterKernelBuffer, channelIndex);
		cLib._graphicalFilterEditorUpdateActualChannelCurve(this.editorPtr, channelIndex);
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

	public changeAudioContext(newAudioContext: AudioContext, channelIndex: number, isSameFilterLR: boolean): boolean {
		if (this.audioContext !== newAudioContext) {
			var oldConvolver = this._convolver;
			if (oldConvolver)
				oldConvolver.disconnect(0);
			this.audioContext = newAudioContext;
			this.filterKernel = newAudioContext.createBuffer(2, this.filterLength, this._sampleRate);
			this._convolver = null;
			this.updateFilter(channelIndex, isSameFilterLR, true);
			this._convolver = newAudioContext.createConvolver();
			this._convolver.normalize = false;
			this._convolver.buffer = this.filterKernel;
			if (this.convolverCallback)
				this.convolverCallback(oldConvolver, this._convolver);
			return true;
		}
		return false;
	}
}
