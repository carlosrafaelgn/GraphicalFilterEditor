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

function AnalyzerWL(audioContext) {
	var mthis = this;
	this.data = new Uint8Array(128);
	this.analyzerL = audioContext.createAnalyser();
	this.analyzerL.fftSize = 128;
	this.analyzerR = audioContext.createAnalyser();
	this.analyzerR.fftSize = 128;
	this.turn = 0;
	this.oL1 = new Float32Array(128);
	this.oL2 = new Float32Array(128);
	this.oR1 = new Float32Array(128);
	this.oR2 = new Float32Array(128);
	this.tmp = new Float32Array(64);
	this.analyze = function () { return AnalyzerWL.prototype.realAnalyze.apply(mthis); };
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
	seal$(this);
	return true;
}
AnalyzerWL.prototype = {
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
	haar: function (x, n, tmp) {
		//input:
		//original time / previous lo pass data
		//output:
		//scaling = lo pass = 1st half
		//wl coeff = hi pass = 2nd half
		//0.70710678118654752440084436210485
		
		var i, n2 = n >>> 1, xi, xi1;
		for (i = 0; i < n; i += 2) {
			xi = x[i];
			xi1 = x[i + 1];
			x[i >>> 1] = (xi + xi1) * 0.70710678118654752440084436210485;
			tmp[i >>> 1] = (xi - xi1) * 0.70710678118654752440084436210485;
		}
		for (i = n2; i < n; i++)
			x[i] = tmp[i - n2];
		
		/*var i, n2 = n >>> 1, t, xi2;
		for (i = 0; i < n2; i++) {
		xi2 = x[i << 1];
		t = (xi2 + x[(i << 1) + 1]) * 0.5;
		tmp[i] = xi2 - t;
		x[i] = t;
		}
		for (i = n2; i < n; i++)
		x[i] = tmp[i - n2];*/
		return true;
	},
	realAnalyze: function () {
		//all the 0.5's here are because of this explanation:
		//http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		//"Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		//over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		//results in two lines that get drawn on the canvas.
		var i, t, tot, w, x, y, y2, tmp = this.tmp, oL1, oL2, oR1, oR2,
			data = this.data, ctx = this.ctx, colors = AnalyzerWL.prototype.colors;
		if (!this.alive) return false;
		if (this.turn) {
			oL1 = this.oL1;
			oL2 = this.oL2;
			oR1 = this.oR1;
			oR2 = this.oR2;
			this.turn = 0;
		} else {
			oL1 = this.oL1;
			oL2 = this.oL2;
			oR1 = this.oR1;
			oR2 = this.oR2;
			this.turn = 1;
		}
		this.analyzerL.getByteTimeDomainData(data);
		for (i = 0; i < 128; i++)
			oL1[i] = (data[i] - 128) * 4;
		i = 128;
		while (i >= 4) {
			AnalyzerWL.prototype.haar(oL1, i, tmp);
			i >>>= 1;
		}
		this.analyzerR.getByteTimeDomainData(data);
		for (i = 0; i < 128; i++)
			oR1[i] = (data[i] - 128) * 4;
		i = 128;
		while (i >= 4) {
			AnalyzerWL.prototype.haar(oR1, i, tmp);
			i >>>= 1;
		}
		//128
		//1 (1)
		//2  .. 3 (2)
		//4  .. 7 (4)
		//8  .. 15 (8)
		//16 .. 31 (16)
		//32 .. 63 (32)
		//64 .. 127 (64)
		tot = 64;
		w = 512 / 64;
		y = 0;
		y2 = 512 - 32;
		for (; ; ) {
			i = tot;
			x = 0;
			while (x < 512) {
				t = oL1[i]; // (oL1[i] * 0.125) + (oL2[i] * 0.875);
				//oL2[i] = t;
				if (t < 0) t = -t;
				if (t >= 127) t = 508;
				else t <<= 2;
				ctx.fillStyle = colors[t >>> 1];
				ctx.fillRect(x, y, w, 32);
				t = oR1[i]; // (oR1[i] * 0.125) + (oR2[i] * 0.875);
				//oR2[i] = t;
				if (t < 0) t = -t;
				if (t >= 127) t = 508;
				else t <<= 2;
				ctx.fillStyle = colors[t >>> 1];
				ctx.fillRect(x, y2, w, 32);
				i++;
				x += w;
			}
			w <<= 1;
			y += 32;
			y2 -= 32;
			if (!tot) break;
			tot >>>= 1;
			if (!tot) w = 512;
		}
		return (this.lastRequest = window.requestAnimationFrame(this.analyze, this.canvas));
	}
}
