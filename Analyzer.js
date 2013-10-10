//
// GraphicalFilterEditor is distributed under the FreeBSD License
//
// Copyright (c) 2013, Carlos Rafael Gimenes das Neves
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
"use strict";

function Analyzer(audioContext, graphicEqualizer) {
	var i, mthis = this, pi = Math.PI, exp = Math.exp, cos = Math.cos, invln10 = 1 / Math.LN10;
	//only the first 1024 samples are necessary as the last
	//1024 samples would always be zeroed out!
	this.data = new Uint8Array(1024);
	this.analyzerL = audioContext.createAnalyser();
	this.analyzerL.fftSize = 1024;
	this.analyzerR = audioContext.createAnalyser();
	this.analyzerR.fftSize = 1024;
	this.tmp = new Float32Array(2048);
	this.window = new Float32Array(1024);
	this.multiplier = new Float32Array(512);
	this.prevL = new Float32Array(512);
	this.prevR = new Float32Array(512);
	this.visibleFrequencies = graphicEqualizer.visibleFrequencies;
	this.analyze = function () { return Analyzer.prototype.realAnalyze.apply(mthis); };
	this.canvas = null;
	this.ctx = null;
	this.alive = false;
	this.lastRequest = null;
	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame = (window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps: https://bugzilla.mozilla.org/show_bug.cgi?id=630127)
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame ||
			function (callback, element) { return window.setTimeout(callback, 1000 / 60); });
	}
	
	for (i = 0; i < 1024; i++) {
		this.window[i] =
		//adjust coefficient (the original C++ code was
		//meant to be used with 16 bit samples)
		4 *
		//Hamming window
		(0.54 - (0.46 * cos(2 * pi * i / 1023)));
	}
	for (i = 0; i < 512; i++) {
		//exp is to increase the gain as the frequency increases
		//145 is just a gain to make the analyzer look good! :)
		this.multiplier[i] = invln10 * 145 * exp(2.5 * i / 511);
	}
	seal$(this);
	return true;
}
Analyzer.prototype = {
	colors: ["#000000", "#0B00B2", "#0C00B1", "#0E00AF", "#0E00AF", "#0F00AE", "#1000AD", "#1200AC", "#1300AB", "#1500AB", "#1600AA", "#1700A9", "#1900A8", "#1A00A6", "#1B00A6", "#1D00A4", "#1F00A3", "#2000A1", "#2200A1", "#2300A0", "#25009E", "#27009D", "#29009C", "#2B009A", "#2D0099", "#2E0098", "#300096", "#320095", "#340094", "#360092", "#380090", "#39008F", "#3C008E", "#3E008C", "#40008B", "#420089", "#440088", "#470086", "#480085", "#4B0083", "#4C0082", "#4F0080", "#51007F", "#54007C", "#56007C", "#57007A", "#5A0078", "#5C0076", "#5F0075", "#610073", "#640071", "#65006F", "#68006E", "#6B006C", "#6D006A", "#6F0069", "#710066", "#740065", "#760063", "#790062", "#7B0060", "#7D005E", "#80005C", "#82005B", "#850059", "#860057", "#890056", "#8C0054", "#8E0052", "#910050", "#93004F", "#96004D", "#97004B", "#9A0049", "#9C0048", "#9F0046", "#A10045", "#A40043", "#A60040", "#A8003F", "#AA003E", "#AD003C", "#AF003A", "#B10039", "#B30037", "#B60035", "#B80034", "#BA0032", "#BC0031", "#BE002E", "#C1002D", "#C3002C", "#C5002A", "#C70028", "#CA0027", "#CB0025", "#CE0024", "#CF0023", "#D10022", "#D30020", "#D6001E", "#D7001D", "#D9001B", "#DB001A", "#DD0019", "#DF0017", "#E10017", "#E20015", "#E40014", "#E60012", "#E70011", "#E90010", "#EA000F", "#EC000D", "#ED000C", "#EF000B", "#F1000B", "#F2000A", "#F40008", "#F50007", "#F60006", "#F70005", "#F90005", "#F90003", "#FB0003", "#FC0002", "#FD0001", "#FE0001", "#FF0000", "#FF0100", "#FF0200", "#FF0300", "#FF0500", "#FF0600", "#FF0600", "#FF0800", "#FF0900", "#FF0B00", "#FF0C00", "#FF0D00", "#FF0F00", "#FF1000", "#FF1200", "#FF1400", "#FF1500", "#FF1700", "#FF1900", "#FF1A00", "#FF1C00", "#FF1D00", "#FF2000", "#FF2200", "#FF2300", "#FF2500", "#FF2700", "#FF2900", "#FF2B00", "#FF2D00", "#FF2F00", "#FF3100", "#FF3400", "#FF3500", "#FF3700", "#FF3900", "#FF3C00", "#FF3E00", "#FF4000", "#FF4200", "#FF4400", "#FF4700", "#FF4900", "#FF4B00", "#FF4E00", "#FF5000", "#FF5200", "#FF5500", "#FF5700", "#FF5900", "#FF5C00", "#FF5E00", "#FF6100", "#FF6300", "#FF6600", "#FF6800", "#FF6A00", "#FF6C00", "#FF6F00", "#FF7200", "#FF7400", "#FF7700", "#FF7900", "#FF7C00", "#FF7E00", "#FF8000", "#FF8300", "#FF8500", "#FF8700", "#FF8A00", "#FF8D00", "#FF8F00", "#FF9200", "#FF9500", "#FF9700", "#FF9900", "#FF9B00", "#FF9E00", "#FFA000", "#FFA300", "#FFA500", "#FFA700", "#FFA900", "#FFAC00", "#FFAE00", "#FFB100", "#FFB200", "#FFB600", "#FFB700", "#FFBA00", "#FFBC00", "#FFBE00", "#FFC100", "#FFC300", "#FFC400", "#FFC700", "#FFC900", "#FFCB00", "#FFCD00", "#FFCF00", "#FFD100", "#FFD300", "#FFD500", "#FFD700", "#FFD900", "#FFDB00", "#FFDD00", "#FFDE00", "#FFE000", "#FFE100", "#FFE400", "#FFE500", "#FFE700", "#FFE900", "#FFEA00", "#FFEB00", "#FFED00", "#FFEF00", "#FFF000", "#FFF100", "#FFF300", "#FFF400", "#FFF500", "#FFF600", "#FFF800", "#FFF900", "#FFFA00", "#FFFB00"],
	createControl: function (parent, id) {
		if (!this.ctx) {
			this.canvas = document.createElement("canvas");
			this.canvas.width = 512;
			this.canvas.height = 512;
			this.canvas.style.position = "relative";
			this.canvas.style.margin = "0px";
			this.canvas.style.padding = "0px";
			this.canvas.style.verticalAlign = "top";
			this.canvas.style.display = "inline-block";
			this.canvas.style.cursor = "default";
			if (id)
				this.canvas.id = id;
			this.ctx = this.canvas.getContext("2d");
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
		if (this.alive) return false;
		this.alive = true;
		this.lastRequest = window.requestAnimationFrame(this.analyze, this.canvas);
		return true;
	},
	stop: function () {
		this.alive = false;
		(
			window.webkitCancelAnimationFrame ||
			window.mozCancelAnimationFrame ||
			window.oCancelAnimationFrame ||
			window.msCancelAnimationFrame ||
			window.cancelAnimationFrame ||
			function (id) { return window.clearTimeout(id); }
		)(this.lastRequest);
		this.lastRequest = null;
		return true;
	},
	realAnalyze: function () {
		//all the 0.5's here are because of this explanation:
		//http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		//"Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		//over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		//results in two lines that get drawn on the canvas.
		var d, im, i, w = this.window, tmp = this.tmp, data = this.data, ctx = this.ctx, sqrt = Math.sqrt, ln = Math.log,
				freq, ii, avg, avgCount,
				valueCount = 512, bw = 44100 / 2048, //one day this value will be replaced with the actual sample rate
				filterLength2 = (2048 >>> 1), cos = Math.cos, lerp = GraphicalFilterEditor.prototype.lerp,
				visibleFrequencies = this.visibleFrequencies, colors = Analyzer.prototype.colors;
		if (!this.alive) return false;

		this.analyzerL.getByteTimeDomainData(data);
		for (i = 0; i < 1024; i++)
			tmp[i] = w[i] * (data[i] - 128);
		for (; i < 2048; i++)
			tmp[i] = 0;
		FFTNR.real(tmp, 2048, 1);
		//DC and Nyquist bins are being ignored
		tmp[0] = 0;
		for (i = 2; i < 2048; i += 2) {
			//0.0009765625 = 1 / (2048/2)
			d = tmp[i] * 0.0009765625; //re
			im = tmp[i + 1] * 0.0009765625; //im
			tmp[i >>> 1] = ln(sqrt((d * d) + (im * im)) + 0.2);
		}
		w = this.multiplier;
		data = this.prevL;

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
			d = (((data[ii] * 4) + (w[ii] * lerp(freq, tmp[i], freq + bw, tmp[i + 1], visibleFrequencies[ii]))) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			data[ii] = d;
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
			d = (((data[ii] * 4) + (w[ii] * avg / avgCount)) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			data[ii] = d;
			ctx.beginPath();
			ctx.strokeStyle = colors[d];
			ctx.moveTo(ii - 0.5, 256.5 - d);
			ctx.lineTo(ii - 0.5, 256.5);
			ctx.stroke();
			ii++;
		}

		//sorry for the copy/paste :(
		w = this.window;
		data = this.data;
		this.analyzerR.getByteTimeDomainData(data);
		for (i = 0; i < 1024; i++)
			tmp[i] = w[i] * (data[i] - 128);
		for (; i < 2048; i++)
			tmp[i] = 0;
		FFTNR.real(tmp, 2048, 1);
		//DC and Nyquist bins are being ignored
		tmp[0] = 0;
		for (i = 2; i < 2048; i += 2) {
			//0.0009765625 = 1 / (2048/2)
			d = tmp[i] * 0.0009765625; //re
			im = tmp[i + 1] * 0.0009765625; //im
			tmp[i >>> 1] = ln(sqrt((d * d) + (im * im)) + 0.2);
		}
		w = this.multiplier;
		data = this.prevR;

		i = 0;
		ii = 0;
		while (ii < (valueCount - 1) && i < filterLength2 && bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii])) {
			freq = bw * i;
			while (i < filterLength2 && (freq + bw) < visibleFrequencies[ii]) {
				i++;
				freq = bw * i;
			}
			d = (((data[ii] * 4) + (w[ii] * lerp(freq, tmp[i], freq + bw, tmp[i + 1], visibleFrequencies[ii]))) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			data[ii] = d;
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
			d = (((data[ii] * 4) + (w[ii] * avg / avgCount)) / 2.5) >> 1;
			if (d > 255) d = 255;
			else if (d < 0) d = 0;
			data[ii] = d;
			ctx.beginPath();
			ctx.strokeStyle = colors[d];
			ctx.moveTo(ii - 0.5, 256.5);
			ctx.lineTo(ii - 0.5, 256.5 + d);
			ctx.stroke();
			ii++;
		}
		return (this.lastRequest = window.requestAnimationFrame(this.analyze, this.canvas));
	}
}
