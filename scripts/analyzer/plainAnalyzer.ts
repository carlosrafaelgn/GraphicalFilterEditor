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

class PlainAnalyzer extends Analyzer {
	private readonly _sampleRate: number;
	private readonly _analyzerL: AnalyserNode;
	private readonly _analyzerR: AnalyserNode;

	private readonly _visibleFrequencies: Float64Array;

	private readonly _ptr: number;
	private readonly _fft4gfPtr: number;
	private readonly _dataPtr: number;
	private readonly _data: Uint8Array;
	private readonly _tmpPtr: number;
	private readonly _tmp: Float32Array;
	private readonly _windowPtr: number;
	private readonly _window: Float32Array;
	private readonly _multiplierPtr: number;
	private readonly _multiplier: Float32Array;
	private readonly _prevLPtr: number;
	private readonly _prevL: Float32Array;
	private readonly _prevRPtr: number;
	private readonly _prevR: Float32Array;

	public constructor(audioContext: AudioContext, parent: HTMLElement, graphicalFilterEditor: GraphicalFilterEditor, id?: string) {
		super(audioContext, parent, id);

		this._sampleRate = graphicalFilterEditor.sampleRate;

		// Only the first 1024 samples are necessary as the last
		// 1024 samples would always be zeroed out!
		this._analyzerL = audioContext.createAnalyser();
		this._analyzerL.fftSize = 1024;
		this._analyzerR = audioContext.createAnalyser();
		this._analyzerR.fftSize = 1024;

		this._visibleFrequencies = graphicalFilterEditor.visibleFrequencies;

		const buffer = cLib.HEAP8.buffer as ArrayBuffer;

		let ptr = cLib._allocBuffer(1024 + (2048 * 4) + (1024 * 4) + (3 * 512 * 4) + cLib._fftSizeOff(2048));
		this._ptr = ptr;

		this._dataPtr = ptr;
		this._data = new Uint8Array(buffer, ptr, 1024);
		ptr += 1024;

		this._tmpPtr = ptr;
		this._tmp = new Float32Array(buffer, ptr, 2048);
		ptr += (2048 * 4);

		this._windowPtr = ptr;
		this._window = new Float32Array(buffer, ptr, 1024);
		ptr += (1024 * 4);

		this._multiplierPtr = ptr;
		this._multiplier = new Float32Array(buffer, ptr, 512);
		ptr += (512 * 4);

		this._prevLPtr = ptr;
		this._prevL = new Float32Array(buffer, ptr, 512);
		ptr += (512 * 4);

		this._prevRPtr = ptr;
		this._prevR = new Float32Array(buffer, ptr, 512);
		ptr += (512 * 4);

		this._fft4gfPtr = ptr;
		cLib._fftInitf(this._fft4gfPtr, 2048);

		const window = this._window,
			multiplier = this._multiplier,
			pi = Math.PI,
			exp = Math.exp,
			cos = Math.cos,
			invln10 = 1 / Math.LN10;

		for (let i = 0; i < 1024; i++) {
			window[i] =
			// Adjust coefficient (the original C++ code was
			// meant to be used with 16 bit samples)
			4 *
			// Hamming window
			(0.54 - (0.46 * cos(2 * pi * i / 1023)));
		}

		for (let i = 0; i < 512; i++) {
			// exp is to increase the gain as the frequency increases
			// 145 is just a gain to make the analyzer look good! :)
			multiplier[i] = invln10 * 145 * exp(2.5 * i / 511);
		}
	}

	protected analyze(time: number): void {
		// All the 0.5's here are because of this explanation:
		// http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		// "Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		// over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		// results in two lines that get drawn on the canvas.

		const multiplier = this._multiplier,
			tmp = this._tmp,
			ctx = this.ctx as CanvasRenderingContext2D, // ctx is null only with WebGL analyzers
			sqrt = Math.sqrt,
			ln = Math.log,
			valueCount = 512, bw = this._sampleRate / 2048,
			filterLength2 = (2048 >>> 1),
			cos = Math.cos,
			visibleFrequencies = this._visibleFrequencies,
			colors = Analyzer.colors;

		let d = 0, im = 0, i = 0, freq = 0, ii = 0, avg = 0, avgCount = 0;

		this._analyzerL.getByteTimeDomainData(this._data);
		cLib._plainAnalyzer(this._fft4gfPtr, this._windowPtr, this._dataPtr, this._tmpPtr);

		let dataf = this._prevL;

		ctx.lineWidth = 1;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, 512, 512);

		i = 0;
		ii = 0;
		while (ii < (valueCount - 1) && i < filterLength2 && bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii])) {
			freq = bw * i;
			while (i < filterLength2 && (freq + bw) < visibleFrequencies[ii]) {
				i++;
				freq = bw * i;
			}
			d = (((dataf[ii] * 4) + (multiplier[ii] * lerp(freq, tmp[i], freq + bw, tmp[i + 1], visibleFrequencies[ii]))) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			dataf[ii] = d;
			ctx.beginPath();
			ctx.strokeStyle = colors[d];
			ctx.moveTo(ii - 0.5, 256.5 - d);
			ctx.lineTo(ii - 0.5, 256.5);
			ctx.stroke();
			ii++;
		}
		i++;
		while (i < filterLength2 && ii < valueCount) {
			avg = 0;
			avgCount = 0;
			do {
				avg += tmp[i];
				avgCount++;
				i++;
				freq = bw * i;
			} while (freq < visibleFrequencies[ii] && i < filterLength2);
			d = (((dataf[ii] * 4) + (multiplier[ii] * avg / avgCount)) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			dataf[ii] = d;
			ctx.beginPath();
			ctx.strokeStyle = colors[d];
			ctx.moveTo(ii - 0.5, 256.5 - d);
			ctx.lineTo(ii - 0.5, 256.5);
			ctx.stroke();
			ii++;
		}

		// Sorry for the copy/paste :(

		this._analyzerR.getByteTimeDomainData(this._data);
		cLib._plainAnalyzer(this._fft4gfPtr, this._windowPtr, this._dataPtr, this._tmpPtr);

		dataf = this._prevR;

		i = 0;
		ii = 0;
		while (ii < (valueCount - 1) && i < filterLength2 && bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii])) {
			freq = bw * i;
			while (i < filterLength2 && (freq + bw) < visibleFrequencies[ii]) {
				i++;
				freq = bw * i;
			}
			d = (((dataf[ii] * 4) + (multiplier[ii] * lerp(freq, tmp[i], freq + bw, tmp[i + 1], visibleFrequencies[ii]))) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			dataf[ii] = d;
			ctx.beginPath();
			ctx.strokeStyle = colors[d];
			ctx.moveTo(ii - 0.5, 256.5);
			ctx.lineTo(ii - 0.5, 256.5 + d);
			ctx.stroke();
			ii++;
		}
		i++;
		while (i < filterLength2 && ii < valueCount) {
			avg = 0;
			avgCount = 0;
			do {
				avg += tmp[i];
				avgCount++;
				i++;
				freq = bw * i;
			} while (freq < visibleFrequencies[ii] && i < filterLength2);
			d = (((dataf[ii] * 4) + (multiplier[ii] * avg / avgCount)) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			dataf[ii] = d;
			ctx.beginPath();
			ctx.strokeStyle = colors[d];
			ctx.moveTo(ii - 0.5, 256.5);
			ctx.lineTo(ii - 0.5, 256.5 + d);
			ctx.stroke();
			ii++;
		}
	}

	protected cleanUp(): void {
		if (this._ptr)
			cLib._freeBuffer(this._ptr);
	}
}
