//
// GraphicalFilterEditor is distributed under the FreeBSD License
//
// Copyright (c) 2012-2015, Carlos Rafael Gimenes das Neves
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those
// of the authors and should not be interpreted as representing official policies,
// either expressed or implied, of the FreeBSD Project.
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
"use strict";

function rand() {
	return ((Math.random() * 65536) | 0);
}

function SoundParticles(audioContext, graphicEqualizer) {
	var i, c, ic, d, mthis = this, exp = Math.exp, FULL = 0.75, HALF = 0.325, ZERO = 0.0,
		COLORS_R = function (A, B) { mthis.COLORS[(3 * A)] = B; },
		COLORS_G = function (A, B) { mthis.COLORS[(3 * A) + 1] = B; },
		COLORS_B = function (A, B) { mthis.COLORS[(3 * A) + 2] = B; };
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
	this.processedData = new Uint8Array(512);
	this.processedDataR = new Uint8Array(512);
	this.fft = new Float32Array(256);
	this.analyze = function () { return SoundParticles.prototype.realAnalyze.apply(mthis); };
	this.canvas = null;
	this.ctx = null;
	this.program = null;
	this.alive = false;
	this.lastRequest = null;

	this.BG_COLUMNS = 31;
	this.BG_PARTICLES_BY_COLUMN = 16;
	this.BG_COUNT = (this.BG_COLUMNS * this.BG_PARTICLES_BY_COLUMN);
	this.COLORS = new Float32Array(16 * 3);
	this.lastTime = 0;
	this.bgPos = new Float32Array(this.BG_COUNT * 2);
	this.bgSpeedY = new Float32Array(this.BG_COUNT);
	this.bgTheta = new Float32Array(this.BG_COUNT);
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

	for (c = 0, i = 0; c < this.BG_COLUMNS; c++) {
		for (ic = 0; ic < this.BG_PARTICLES_BY_COLUMN; ic++, i++)
			this.fillBgParticle(i, -1.2 + (0.01953125 * (rand() & 127)));
	}

	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame = (window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps: https://bugzilla.mozilla.org/show_bug.cgi?id=630127)
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback, element) { return window.setTimeout(callback, 1000 / 60); });
	}
	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = (window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			window.msCancelAnimationFrame ||
			function (id) { return window.clearTimeout(id); });
	}
	if (!Date.now) {
		Date.now = function () {
			return (+new Date());
		};
	}
	seal$(this);
	return true;
}
SoundParticles.prototype = {
	err: function (errId) {
		this.ctx = null;
		this.program.deleteAll();
		this.program = null;
		alert("Sorry! WebGL error " + errId + " :(");
		return null;
	},
	fillBgParticle: function (index, y) {
		this.bgPos[(index << 1)] = 0.0078125 * ((rand() & 7) - 4);
		this.bgPos[(index << 1) + 1] = y;
		this.bgTheta[index] = 0.03125 * (rand() & 63);
		this.bgSpeedY[index] = 0.125 + (0.00390625 * (rand() & 15));
		this.bgColor[index] = rand() & 15;
	},
	fillTexture: function (gl) {
		var x, y, d, d2, v, sqrtf = Math.sqrt, xf, yf, TEXTURE_SIZE = 64, tex = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE), smoothStep = function (edge0, edge1, x) {
			var t = (x - edge0) / (edge1 - edge0);
			return ((t <= 0.0) ? 0.0 :
				((t >= 1.0) ? 1.0 :
					(t * t * (3.0 - (2.0 * t)))
				)
			);
		};

		for (y = 0; y < TEXTURE_SIZE; y++) {
			yf = (y - (TEXTURE_SIZE >> 1));
			yf *= yf;
			for (x = 0; x < TEXTURE_SIZE; x++) {
				xf = (x - (TEXTURE_SIZE >> 1));

				d = sqrtf((xf * xf) + yf) / ((TEXTURE_SIZE / 2) - 2.0);
				if (d > 1.0) d = 1.0;

				d2 = d;
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

				v = ((255.0 * d) | 0);
				tex[(y * TEXTURE_SIZE) + x] = ((v >= 255) ? 255 : v);
			}
		}
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, TEXTURE_SIZE, TEXTURE_SIZE, 0, gl.ALPHA, gl.UNSIGNED_BYTE, tex);
	},
	createControl: function (parent, id) {
		if (!this.ctx) {
			this.canvas = document.createElement("canvas");
			this.canvas.width = 512;
			this.canvas.height = 320;
			this.canvas.style.position = "relative";
			this.canvas.style.margin = "0px";
			this.canvas.style.padding = "0px";
			this.canvas.style.verticalAlign = "top";
			this.canvas.style.display = "inline-block";
			this.canvas.style.cursor = "default";
			if (id)
				this.canvas.id = id;
			this.ctx = Program.prototype.createGL(this.canvas);
			if (!this.ctx) {
				alert("Sorry! Apparently your browser does not support WebGL :(");
				return null;
			}

			this.program = new Program(this.ctx,
				// Vertex shader (one attribute and one uniform per line)
				"attribute vec4 inPosition;\n" +
				"attribute vec2 inTexCoord;\n" +
				"uniform float amplitude;\n" +
				"uniform float baseX;\n" +
				"uniform vec2 pos;\n" +
				"uniform vec2 aspect;\n" +
				"uniform vec3 color;\n" +
				"uniform float theta;\n" +
				"varying vec2 vTexCoord; varying vec3 vColor; void main() {" +
				"float a = mix(0.0625, 0.34375, amplitude);" +
				"float bottom = 1.0 - clamp(pos.y, -1.0, 1.0);" +
				"bottom = bottom * bottom * bottom * 0.125;" +
				"a = (0.75 * a) + (0.25 * bottom);" +
				"gl_Position = vec4(baseX + pos.x + (5.0 * (pos.y + 1.0) * pos.x * sin((2.0 * pos.y) + theta)) + (inPosition.x * aspect.x * a), pos.y + (inPosition.y * aspect.y * a), 0.0, 1.0);" +
				"vTexCoord = inTexCoord;" +
				"vColor = color + bottom + (0.25 * amplitude); }",
				// Fragment shader (one uniform per line)
				"precision mediump float;\n" +
				"uniform sampler2D texColor;\n" +
				"varying vec2 vTexCoord; varying vec3 vColor; void main() {" +
				"float a = texture2D(texColor, vTexCoord).a;" +
				"gl_FragColor = vec4(vColor.r * a, vColor.g * a, vColor.b * a, 1.0); }", false, false);
			this.program.use();
			this.program.texColor(0);
			this.program.aspect(320.0 / 512.0, 1);

			var gl = this.ctx, glBuf0, glBuf1, glTex, glVerticesRect, glTexCoordsRect;

			glVerticesRect = new Float32Array([
				-1, -1, 0, 1,
				1, -1, 0, 1,
				-1, 1, 0, 1,
				1, 1, 0, 1]);

			glTexCoordsRect = new Float32Array([
				0, 1,
				1, 1,
				0, 0,
				1, 0]);

			glBuf0 = gl.createBuffer();
			glBuf1 = gl.createBuffer();
			if (gl.getError() || !glBuf0 || !glBuf1)
				return this.err(-1);

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

			glTex = gl.createTexture();
			if (gl.getError() || !glTex)
				return this.err(-2);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, glTex);
			if (gl.getError())
				return this.err(-3);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			SoundParticles.prototype.fillTexture(gl);

			if (gl.getError())
				return this.err(-4);

			gl.enableVertexAttribArray(0);
			gl.bindBuffer(gl.ARRAY_BUFFER, glBuf0);
			gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);

			gl.enableVertexAttribArray(1);
			gl.bindBuffer(gl.ARRAY_BUFFER, glBuf1);
			gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

			parent.appendChild(this.canvas);
			return this.canvas;
		}
		return null;
	},
	destroyControl: function () {
		this.stop();
		if (this.ctx) {
			this.ctx = null;
			this.canvas.parentNode.removeChild(this.canvas);
			this.canvas = null;
		}
		return true;
	},
	start: function () {
		if (this.alive || !this.ctx) return false;
		this.lastTime = Date.now();
		this.alive = true;
		this.lastRequest = window.requestAnimationFrame(this.analyze, this.canvas);
		return true;
	},
	stop: function () {
		this.alive = false;
		window.cancelAnimationFrame(this.lastRequest);
		this.lastRequest = null;
		return true;
	},
	realAnalyze: function () {
		if (!this.alive) return false;

		var time = Date.now(), delta = (time - this.lastTime), gl = this.ctx, a,
		avg, p = 0, c, ic, i, idx, last = 44, last2 = 116, coefNew = (0.0625 / 16.0) * delta,
		coefOld = 1.0 - coefNew, processedData = this.processedData, processedDataR = this.processedDataR, fft = this.fft,
		BG_COLUMNS = this.BG_COLUMNS, BG_PARTICLES_BY_COLUMN = this.BG_PARTICLES_BY_COLUMN, COLORS = this.COLORS,
		program = this.program, bgPos = this.bgPos, bgSpeedY = this.bgSpeedY, bgColor = this.bgColor,
		bgTheta = this.bgTheta, MAX = Math.max;

		delta *= 0.001;
		this.lastTime = time;

		// http://www.w3.org/TR/webaudio/
		// http://webaudio.github.io/web-audio-api/#widl-AnalyserNode-getByteTimeDomainData-void-Uint8Array-array
		this.analyzerL.getByteFrequencyData(processedData);
		this.analyzerR.getByteFrequencyData(processedDataR);
		// Use only the first 256 amplitudes (which convers DC to 11025Hz, considering a sample rate of 44100Hz)
		for (i = 0; i < 256; i++) {
			c = MAX(processedData[i], processedDataR[i]);
			ic = ((c < 8) ? 0.0 : c);
			idx = fft[i];
			if (ic < idx)
				ic = (coefNew * ic) + (coefOld * idx);
			fft[i] = ic;
			processedData[i] = ((ic >= 255) ? 255 : ic);
		}

		gl.clear(gl.COLOR_BUFFER_BIT);

		i = 2;
		for (c = 0; c < BG_COLUMNS; c++) {
			// Instead of dividing by 255, we are dividing by 256 (* 0.00390625f)
			// since the difference is visually unnoticeable

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
				avg = 0;
				for (; i < last; i++)
					avg = MAX(avg, processedData[i]);
				a = avg * (2.0 * 0.00390625);
				last += 8;
			} else {
				avg = 0;
				for (; i < last2; i++)
					avg = MAX(avg, processedData[i]);
				a = avg * (2.5 * 0.00390625);
				last2 += 16;
			}

			program.amplitude((a >= 1.0) ? 1.0 : a);
			// The 31 columns spread from -0.9 to 0.9, and they are evenly spaced
			program.baseX(-0.9 + (0.06206897 * c));

			for (ic = 0; ic < BG_PARTICLES_BY_COLUMN; ic++, p++) {
				if (bgPos[(p << 1) + 1] > 1.2)
					this.fillBgParticle(p, -1.2);
				else
					bgPos[(p << 1) + 1] += bgSpeedY[p] * delta;
				idx = bgColor[p] * 3;
				program.color(COLORS[idx], COLORS[idx + 1], COLORS[idx + 2]);
				idx = (p << 1);
				program.pos(bgPos[idx], bgPos[idx + 1]);
				program.theta(bgTheta[p]);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			}
		}

		return (this.lastRequest = window.requestAnimationFrame(this.analyze, this.canvas));
	}
}
