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

//
// This visualizer is a WebGL port of the visualizer with the same name, created
// for my Android player, FPlay: https://github.com/carlosrafaelgn/FPlayAndroid
//
// https://github.com/carlosrafaelgn/FPlayAndroid/blob/master/jni/Common.h
// https://github.com/carlosrafaelgn/FPlayAndroid/blob/master/jni/OpenGLVisualizerJni.h
// https://github.com/carlosrafaelgn/FPlayAndroid/blob/master/jni/GLSoundParticle.h
//

class SoundParticlesAnalyzer extends Analyzer {
	// Vertex shader (one attribute and one uniform per line)
	private static readonly vertexShaderSource = `precision mediump float;
attribute vec4 inPosition;
attribute vec2 inTexCoord;
uniform float amplitude;
uniform float baseX;
uniform vec2 pos;
uniform vec2 aspect;
uniform vec3 color;
uniform float theta;
varying vec2 vTexCoord;
varying vec3 vColor;

void main() {
	float a = mix(0.0625, 0.34375, amplitude);
	float bottom = 1.0 - clamp(pos.y, -1.0, 1.0);
	bottom = bottom * bottom * bottom * 0.125;
	a = (0.75 * a) + (0.25 * bottom);
	gl_Position = vec4(baseX + pos.x + (5.0 * (pos.y + 1.0) * pos.x * sin((2.0 * pos.y) + theta)) + (inPosition.x * aspect.x * a), pos.y + (inPosition.y * aspect.y * a), 0.0, 1.0);
	vTexCoord = inTexCoord;
	vColor = color + bottom + (0.25 * amplitude);
}`;

	// Fragment shader (one uniform per line)
	private static readonly fragmentShaderSource = `precision lowp float;
uniform sampler2D texColor;
varying vec2 vTexCoord;
varying vec3 vColor;

void main() {
	float a = texture2D(texColor, vTexCoord).a;
	gl_FragColor = vec4(vColor.rgb * a, 1.0);
}`;

	private static rand(): number {
		return ((Math.random() * 65536) | 0);
	}

	private readonly analyzerL: AnalyserNode;
	private readonly analyzerR: AnalyserNode;

	private readonly ptr: number;
	private readonly processedDataPtr: number;
	private readonly processedData: Uint8Array;
	private readonly processedDataRPtr: number;
	private readonly processedDataR: Uint8Array;
	private readonly fftPtr: number;
	private readonly fft: Float32Array;
	private readonly COLORSPtr: number;
	private readonly COLORS: Float32Array;
	private readonly bgPosPtr: number;
	private readonly bgPos: Float32Array;
	private readonly bgSpeedYPtr: number;
	private readonly bgSpeedY: Float32Array;
	private readonly bgThetaPtr: number;
	private readonly bgTheta: Float32Array;
	private readonly bgColorPtr: number;
	private readonly bgColor: Uint8Array;

	private readonly BG_COLUMNS = 31;
	private readonly BG_PARTICLES_BY_COLUMN = 16;
	private readonly BG_COUNT = (this.BG_COLUMNS * this.BG_PARTICLES_BY_COLUMN);

	private readonly program: Program;
	private lastTime = 0;

	public constructor(audioContext: AudioContext, parent: HTMLElement, graphicalFilterEditor: GraphicalFilterEditor, id?: string) {
		super(audioContext, parent, id, true, Analyzer.controlWidth, 320);

		this.analyzerL = audioContext.createAnalyser();
		this.analyzerL.fftSize = 1024;
		this.analyzerL.maxDecibels = -12;
		this.analyzerL.minDecibels = -45;
		this.analyzerL.smoothingTimeConstant = 0;
		this.analyzerR = audioContext.createAnalyser();
		this.analyzerR.fftSize = 1024;
		this.analyzerR.maxDecibels = -12;
		this.analyzerR.minDecibels = -45;
		this.analyzerR.smoothingTimeConstant = 0;

		const exp = Math.exp,
			FULL = 0.75,
			HALF = 0.325,
			ZERO = 0.0,
			COLORS_R = (A: number, B: number) => { this.COLORS[(3 * A)] = B; },
			COLORS_G = (A: number, B: number) => { this.COLORS[(3 * A) + 1] = B; },
			COLORS_B = (A: number, B: number) => { this.COLORS[(3 * A) + 2] = B; };

		const buffer = cLib.HEAP8.buffer as ArrayBuffer;

		let ptr = cLib._allocBuffer((2 * 512) + (256 * 4) + (16 * 3 * 4) + (this.BG_COUNT * 2 * 4) + (2 * this.BG_COUNT * 4) + this.BG_COUNT);
		this.ptr = ptr;

		this.processedDataPtr = ptr;
		this.processedData = new Uint8Array(512);
		ptr += 512;

		this.processedDataRPtr = ptr;
		this.processedDataR = new Uint8Array(512);
		ptr += 512;

		this.fftPtr = ptr;
		this.fft = new Float32Array(256);
		ptr += (256 * 4);

		this.COLORSPtr = ptr;
		this.COLORS = new Float32Array(16 * 3);
		ptr += (16 * 3 * 4);

		this.bgPosPtr = ptr;
		this.bgPos = new Float32Array(this.BG_COUNT * 2);
		ptr += (this.BG_COUNT * 2 * 4);

		this.bgSpeedYPtr = ptr;
		this.bgSpeedY = new Float32Array(this.BG_COUNT);
		ptr += (this.BG_COUNT * 4);

		this.bgThetaPtr = ptr;
		this.bgTheta = new Float32Array(this.BG_COUNT);
		ptr += (this.BG_COUNT * 4);

		this.bgColorPtr = ptr;
		this.bgColor = new Uint8Array(this.BG_COUNT);

		COLORS_R(0, FULL); COLORS_G(0, ZERO); COLORS_B(0, ZERO);
		COLORS_R(1, ZERO); COLORS_G(1, FULL); COLORS_B(1, ZERO);
		COLORS_R(2, ZERO); COLORS_G(2, ZERO); COLORS_B(2, FULL);
		COLORS_R(3, FULL); COLORS_G(3, ZERO); COLORS_B(3, FULL);
		COLORS_R(4, FULL); COLORS_G(4, FULL); COLORS_B(4, ZERO);
		COLORS_R(5, ZERO); COLORS_G(5, FULL); COLORS_B(5, FULL);
		COLORS_R(6, FULL); COLORS_G(6, FULL); COLORS_B(6, FULL);
		COLORS_R(7, FULL); COLORS_G(7, HALF); COLORS_B(7, ZERO);
		COLORS_R(8, FULL); COLORS_G(8, ZERO); COLORS_B(8, HALF);
		COLORS_R(9, HALF); COLORS_G(9, FULL); COLORS_B(9, ZERO);
		COLORS_R(10, ZERO); COLORS_G(10, FULL); COLORS_B(10, HALF);
		COLORS_R(11, ZERO); COLORS_G(11, HALF); COLORS_B(11, FULL);
		COLORS_R(12, HALF); COLORS_G(12, ZERO); COLORS_B(12, FULL);
		// The colors I like most appear twice ;)
		COLORS_R(13, ZERO); COLORS_G(13, ZERO); COLORS_B(13, FULL);
		COLORS_R(14, FULL); COLORS_G(14, HALF); COLORS_B(14, ZERO);
		COLORS_R(15, ZERO); COLORS_G(15, HALF); COLORS_B(15, FULL);

		for (let c = 0, i = 0; c < this.BG_COLUMNS; c++) {
			for (let ic = 0; ic < this.BG_PARTICLES_BY_COLUMN; ic++, i++)
				this.fillBgParticle(i, -1.2 + (0.01953125 * (SoundParticlesAnalyzer.rand() & 127)));
		}

		const program = Program.create(this.canvas, {
			alpha: false,
			depth: false,
			stencil: false,
			antialias: false,
			premultipliedAlpha: true
		}, SoundParticlesAnalyzer.vertexShaderSource, SoundParticlesAnalyzer.fragmentShaderSource);

		if (!program) {
			this.err("Apparently your browser does not support WebGL");
			// TypeScript does not understand this.err() does not return...
			throw new Error();
		}

		this.program = program;

		this.program.use();
		this.program["texColor"](0);
		this.program["aspect"](320.0 / 512.0, 1);

		const gl = this.program.gl,
			glVerticesRect = new Float32Array([
				-1, -1, 0, 1,
				1, -1, 0, 1,
				-1, 1, 0, 1,
				1, 1, 0, 1
			]),
			glTexCoordsRect = new Float32Array([
				0, 1,
				1, 1,
				0, 0,
				1, 0
			]),
			glBuf0 = gl.createBuffer(),
			glBuf1 = gl.createBuffer();

		if (gl.getError() || !glBuf0 || !glBuf1)
			this.err(-1);

		// Create a rectangle for the particles
		gl.bindBuffer(gl.ARRAY_BUFFER, glBuf0);
		gl.bufferData(gl.ARRAY_BUFFER, glVerticesRect, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, glBuf1);
		gl.bufferData(gl.ARRAY_BUFFER, glTexCoordsRect, gl.STATIC_DRAW);

		gl.clearColor(0, 0, 0, 1);

		// According to the docs, glTexImage2D initially expects images to be aligned on 4-byte
		// boundaries, but for ANDROID_BITMAP_FORMAT_RGB_565, AndroidBitmap_lockPixels aligns images
		// on 2-byte boundaries, making a few images look terrible!
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);

		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.DITHER);
		gl.disable(gl.SCISSOR_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE);
		gl.blendEquation(gl.FUNC_ADD);
		//gl.enable(gl.TEXTURE_2D); // WebGL returns an error by default when enabling TEXTURE_2D
		gl.getError(); // Clear any eventual error flags

		const glTex = gl.createTexture();
		if (gl.getError() || !glTex)
			this.err(-2);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, glTex);
		if (gl.getError())
			this.err(-3);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		this.fillTexture();

		if (gl.getError())
			this.err(-4);

		gl.enableVertexAttribArray(0);
		gl.bindBuffer(gl.ARRAY_BUFFER, glBuf0);
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

		gl.enableVertexAttribArray(1);
		gl.bindBuffer(gl.ARRAY_BUFFER, glBuf1);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
	}

	private err(errId: number | string): void {
		this.destroy();
		alert("Sorry! WebGL error :(\n" + errId);
		throw errId;
	}

	private fillBgParticle(index: number, y: number): void {
		this.bgPos[(index << 1)] = 0.0078125 * ((SoundParticlesAnalyzer.rand() & 7) - 4);
		this.bgPos[(index << 1) + 1] = y;
		this.bgTheta[index] = 0.03125 * (SoundParticlesAnalyzer.rand() & 63);
		this.bgSpeedY[index] = 0.125 + (0.00390625 * (SoundParticlesAnalyzer.rand() & 15));
		this.bgColor[index] = SoundParticlesAnalyzer.rand() & 15;
	}

	private fillTexture(): void {
		const gl = this.program.gl,
			sqrtf = Math.sqrt,
			TEXTURE_SIZE = 64,
			tex = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE);

		for (let y = 0; y < TEXTURE_SIZE; y++) {
			let yf = (y - (TEXTURE_SIZE >> 1));
			yf *= yf;
			for (let x = 0; x < TEXTURE_SIZE; x++) {
				let xf = (x - (TEXTURE_SIZE >> 1));

				let d = sqrtf((xf * xf) + yf) / ((TEXTURE_SIZE / 2) - 2.0);
				if (d > 1.0) d = 1.0;

				let d2 = d;
				d = 1.0 - d;
				d = d * d;
				d = d + (0.5 * d);
				if (d < 0.55)
					d = 0.0;
				else if (d < 1.0)
					d = smoothStep(0.55, 1.0, d);

				d2 = 1.0 - d2;
				d2 = smoothStep(0.0, 1.0, d2);
				d2 = d2 * d2;
				d2 = d2 + d2;
				if (d2 > 1.0) d2 = 1.0;

				d = (d + 0.5 * d2);

				let v = ((255.0 * d) | 0);
				tex[(y * TEXTURE_SIZE) + x] = ((v >= 255) ? 255 : v);
			}
		}
		
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, TEXTURE_SIZE, TEXTURE_SIZE, 0, gl.ALPHA, gl.UNSIGNED_BYTE, tex);
	}

	protected analyze(time: number): void {
		// For the future: rethink this, create a large vertex buffer,
		// process everything in C and call drawArrays() only once,
		// like what is done in https://github.com/carlosrafaelgn/pixel :)
		let delta = (time - this.lastTime);
		if (delta > 33)
			delta = 33;
		this.lastTime = time;

		const gl = this.program.gl,
			coefNew = (0.0625 / 16.0) * delta, coefOld = 1.0 - coefNew,
			processedData = this.processedData, processedDataR = this.processedDataR, fft = this.fft,
			BG_COLUMNS = this.BG_COLUMNS, BG_PARTICLES_BY_COLUMN = this.BG_PARTICLES_BY_COLUMN, COLORS = this.COLORS,
			program = this.program, bgPos = this.bgPos, bgSpeedY = this.bgSpeedY, bgColor = this.bgColor,
			bgTheta = this.bgTheta, MAX = Math.max;

		let i = 0, last = 44, last2 = 116;

		delta *= 0.001;

		// http://www.w3.org/TR/webaudio/
		// http://webaudio.github.io/web-audio-api/#widl-AnalyserNode-getByteTimeDomainData-void-Uint8Array-array
		this.analyzerL.getByteFrequencyData(processedData);
		this.analyzerR.getByteFrequencyData(processedDataR);

		// Use only the first 256 amplitudes (which convers DC to 11025Hz, considering a sample rate of 44100Hz)
		for (i = 0; i < 256; i++) {
			let d = MAX(processedData[i], processedDataR[i]);
			if (d < 8)
				d = 0.0;
			const oldD = fft[i];
			if (d < oldD)
				d = (coefNew * d) + (coefOld * oldD);
			fft[i] = d;
			processedData[i] = ((d >= 255) ? 255 : d);
		}

		gl.clear(gl.COLOR_BUFFER_BIT);

		i = 2;
		for (let c = 0, p = 0; c < BG_COLUMNS; c++) {
			// Instead of dividing by 255, we are dividing by 256 (* 0.00390625f)
			// since the difference is visually unnoticeable
			let a: number;

			// Increase the amplitudes as the frequency increases, in order to improve the effect
			if (i < 6) {
				a = processedData[i] * 0.00390625;
				i++;
			} else if (i < 20) {
				a = MAX(processedData[i], processedData[i + 1]) * (1.5 * 0.00390625);
				i += 2;
			} else if (i < 36) {
				a = MAX(processedData[i], processedData[i + 1], processedData[i + 2], processedData[i + 3]) * (1.5 * 0.00390625);
				i += 4;
			} else if (i < 100) {
				let avg = 0;
				for (; i < last; i++)
					avg = MAX(avg, processedData[i]);
				a = avg * (2.0 * 0.00390625);
				last += 8;
			} else {
				let avg = 0;
				for (; i < last2; i++)
					avg = MAX(avg, processedData[i]);
				a = avg * (2.5 * 0.00390625);
				last2 += 16;
			}

			program["amplitude"]((a >= 1.0) ? 1.0 : a);
			// The 31 columns spread from -0.9 to 0.9, and they are evenly spaced
			program["baseX"](-0.9 + (0.06206897 * c));

			for (let ic = 0; ic < BG_PARTICLES_BY_COLUMN; ic++, p++) {
				if (bgPos[(p << 1) + 1] > 1.2)
					this.fillBgParticle(p, -1.2);
				else
					bgPos[(p << 1) + 1] += bgSpeedY[p] * delta;
				let idx = bgColor[p] * 3;
				program["color"](COLORS[idx], COLORS[idx + 1], COLORS[idx + 2]);
				idx = (p << 1);
				program["pos"](bgPos[idx], bgPos[idx + 1]);
				program["theta"](bgTheta[p]);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			}
		}
	}

	protected cleanUp(): void {
		if (this.ptr)
			cLib._freeBuffer(this.ptr);
		if (this.program)
			this.program.destroy();
	}
}
