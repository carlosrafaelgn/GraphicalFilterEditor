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

class WaveletAnalyzer extends Analyzer {
	private readonly analyzerL: AnalyserNode;
	private readonly analyzerR: AnalyserNode;

	private readonly ptr: number;
	private readonly dataLPtr: number;
	private readonly dataL: Uint8Array;
	private readonly dataRPtr: number;
	private readonly dataR: Uint8Array;
	private readonly tmpPtr: number;
	private readonly tmp: Float32Array;
	private readonly oL1Ptr: number;
	private readonly oL1: Float32Array;
	private readonly oR1Ptr: number;
	private readonly oR1: Float32Array;

	public constructor(audioContext: AudioContext, parent: HTMLElement, graphicalFilterEditor: GraphicalFilterEditor, id?: string) {
		super(audioContext, parent, id);

		this.analyzerL = audioContext.createAnalyser();
		this.analyzerL.fftSize = 128;
		this.analyzerR = audioContext.createAnalyser();
		this.analyzerR.fftSize = 128;

		const buffer = cLib.HEAP8.buffer as ArrayBuffer;

		let ptr = cLib._allocBuffer((2 * 128) + (64 * 4) + (2 * 128 * 4));
		this.ptr = ptr;

		this.dataLPtr = ptr;
		this.dataL = new Uint8Array(buffer, ptr, 128);
		ptr += 128;

		this.dataRPtr = ptr;
		this.dataR = new Uint8Array(buffer, ptr, 128);
		ptr += 128;

		this.tmpPtr = ptr;
		this.tmp = new Float32Array(buffer, ptr, 64);
		ptr += 64 * 4;

		this.oL1Ptr = ptr;
		this.oL1 = new Float32Array(buffer, ptr, 128);
		ptr += (128 * 4);

		this.oR1Ptr = ptr;
		this.oR1 = new Float32Array(buffer, ptr, 128);
	}

	protected analyze(time: number): void {
		// All the 0.5's here are because of this explanation:
		// http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		// "Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		// over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		// results in two lines that get drawn on the canvas.
		const ctx = this.ctx as CanvasRenderingContext2D, // ctx is null only with WebGL analyzers
			colors = Analyzer.Colors,
			oL1 = this.oL1,
			oR1 = this.oR1;

		this.analyzerL.getByteTimeDomainData(this.dataL);
		this.analyzerR.getByteTimeDomainData(this.dataR);

		cLib._waveletAnalyzer(this.dataLPtr, this.dataRPtr, this.tmpPtr, this.oL1Ptr, this.oR1Ptr);

		let i = 0, t = 0, tot = 64, w = Analyzer.ControlWidth / 64, x = 0, y = 0, y2 = Analyzer.ControlHeight - 32;

		// 128
		// 1 (1)
		// 2  .. 3 (2)
		// 4  .. 7 (4)
		// 8  .. 15 (8)
		// 16 .. 31 (16)
		// 32 .. 63 (32)
		// 64 .. 127 (64)
		for (; ; ) {
			i = tot;
			x = 0;
			while (x < 512) {
				t = oL1[i]; // (oL1[i] * 0.125) + (oL2[i] * 0.875);
				//oL2[i] = t;
				if (t < 0)
					t = -t;
				if (t >= 127)
					t = 508;
				else
					t <<= 2;
				ctx.fillStyle = colors[t >>> 1];
				ctx.fillRect(x, y, w, 32);
				t = oR1[i]; // (oR1[i] * 0.125) + (oR2[i] * 0.875);
				//oR2[i] = t;
				if (t < 0)
					t = -t;
				if (t >= 127)
					t = 508;
				else
					t <<= 2;
				ctx.fillStyle = colors[t >>> 1];
				ctx.fillRect(x, y2, w, 32);
				i++;
				x += w;
			}
			w <<= 1;
			y += 32;
			y2 -= 32;
			if (!tot)
				break;
			tot >>>= 1;
			if (!tot)
				w = 512;
		}
	}

	protected cleanUp(): void {
		if (this.ptr)
			cLib._freeBuffer(this.ptr);
	}
}
