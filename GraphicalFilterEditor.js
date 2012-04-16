//
// GraphicalFilterEditor.js is distributed under the FreeBSD License
//
// Copyright (c) 2012, Carlos Rafael Gimenes das Neves
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
// https://github.com/carlosrafaelgn/GraphicalFilterEditor/blob/master/GraphicalFilterEditor.js
//
"use strict";

function GraphicalFilterEditor(filterLength, sampleRate, audioContext) {
	var i, s, freqSteps, firstFreqs, f, mthis = this;
	
	this.filterLength = 2048;
	this.currentChannelIndex = 0;
	this.binCount = (this.filterLength >>> 1) + 1;
	this.audioContext = audioContext;
	this.filterKernel = audioContext.createBuffer(2, this.filterLength, sampleRate);
	this.convolver = audioContext.createConvolver();
	this.convolver.normalize = false;
	this.convolver.buffer = this.filterKernel;
	this.rfft = new RFFT(this.filterLength, sampleRate);
	this.visibleBinCount = 512;
	//sorry, but due to the frequency mapping I created, this class will only work with
	//512 visible bins... in order to change this, a new frequency mapping must be created...
	if (this.visibleBinCount !== 512) {
		alert("Sorry, class available only for 512 bins! :(");
		throw "Sorry, class available only for 512 bins! :(";
	}
	this.visibleFrequencies = new Uint16Array(this.visibleBinCount);
	this.equivalentZones = new Uint16Array([31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
	this.equivalentZonesFrequencyCount = new Uint16Array([0, 9, 9 + 9, 18 + 9 + 9, 35 + 18 + 9 + 9, 36 + 35 + 18 + 9 + 9, 70 + 36 + 35 + 18 + 9 + 9, 72 + 70 + 36 + 35 + 18 + 9 + 9, 72 + 72 + 70 + 36 + 35 + 18 + 9 + 9, 72 + 72 + 72 + 70 + 36 + 35 + 18 + 9 + 9, 512]);
	this.validYRangeHeight = 255;
	this.zeroChannelValueY = this.validYRangeHeight >>> 1;
	this.maximumChannelValue = 127;
	this.minimumChannelValue = -127;
	this.channelValueRange = 255;
	this.minusInfiniteChannelValue = -128;
	this.maximumChannelValueY = 0;
	this.minimumChannelValueY = this.validYRangeHeight - 1;
	this.channelCurves = new Array(2);
	this.channelCurves[0] = new Int16Array(this.visibleBinCount);
	this.channelCurves[1] = new Int16Array(this.visibleBinCount);
	this.actualChannelCurves = new Array(2);
	this.actualChannelCurves[0] = new Int16Array(this.visibleBinCount);
	this.actualChannelCurves[1] = new Int16Array(this.visibleBinCount);
	
	freqSteps = new Uint16Array([5, 5, 5, 5, 10, 10, 20, 40, 80, 89]);
	firstFreqs = new Uint16Array([5, 50, 95, 185, 360, 720, 1420, 2860, 5740, 11498]);
	f = firstFreqs[0];
	for (i = (this.visibleBinCount - 1); i >= 0; i--) {
		this.channelCurves[0][i] = this.zeroChannelValueY;
		this.channelCurves[1][i] = this.zeroChannelValueY;
		this.actualChannelCurves[0][i] = this.zeroChannelValueY;
		this.actualChannelCurves[1][i] = this.zeroChannelValueY;
	}
	for (i = 0, s = 0; i < this.visibleBinCount; i++) {
		this.visibleFrequencies[i] = f;
		if ((i + 1) >= this.equivalentZonesFrequencyCount[s + 1] && s !== (this.equivalentZonesFrequencyCount.length - 1)) {
			s++;
			f = firstFreqs[s];
		} else {
			f += freqSteps[s];
		}
	}
	
	this.element = null;
	this.canvas = null;
	this.ctx = null;
	this.rangeImage = null;
	this.labelImage = null;
	this.btnMnu = null;
	this.mnu = null;
	this.mnuChBL = null;
	this.mnuChL = null;
	this.mnuChBR = null;
	this.mnuChR = null;
	this.mnuShowZones = null;
	this.mnuEditZones = null;
	this.mnuShowActual = null;
	this.lblCursor = null;
	this.lblCurve = null;
	this.lblFrequency = null;
	this.showZones = false;
	this.editZones = false;
	this.showActualResponse = true;
	this.sameFilterLR = true;
	this.drawingMode = 0;
	this.lastDrawX = 0;
	this.lastDrawY = 0;
	this.drawOffsetX = 0;
	this.drawOffsetY = 0;
	this.tmpActual = null;
	this.document_OnMouseMove = function (e) { return GraphicalFilterEditor.prototype.canvas_OnMouseMove.apply(mthis, arguments); };
	this.document_OnMouseUp = function (e) { return GraphicalFilterEditor.prototype.canvas_OnMouseUp.apply(mthis, arguments); };
	
	this.updateFilter();
	this.updateActualChannelCurve();
	
	seal$(this);
}

GraphicalFilterEditor.prototype = {
	lerp: function (x0, y0, x1, y1, x) {
		return ((x - x0) * (y1 - y0) / (x1 - x0)) + y0;
	},
	formatDB: function (dB) {
		if (dB < -40) return "-Inf."; //∞";
		return ((dB < 0) ? dB.toFixed(2) : ((dB === 0) ? "-" + dB.toFixed(2) : "+" + dB.toFixed(2)));
	},
	formatFrequency: function (frequencyAndEquivalent) {
		return frequencyAndEquivalent[0] + "Hz (" + ((frequencyAndEquivalent[1] < 1000) ? frequencyAndEquivalent[1] : ((frequencyAndEquivalent[1] / 1000) + "k")) + "Hz)";
	},
	createControl: function (parent, id) {
		if (!this.ctx) {
			var mthis = this;

			//one day the controls will have to be actually
			//created here rather than fetched from the document
			this.canvas = $("graphicEqualizer");
			this.element = this.canvas.parentNode;
			this.lblCursor = $("graphicEqualizerLblCursor");
			this.lblCurve = $("graphicEqualizerLblCurve");
			this.lblFrequency = $("graphicEqualizerLblFrequency");
			this.btnMnu = $("graphicEqualizerBtnMnu");
			this.mnu = $("graphicEqualizerMnu");
			this.mnuChBL = $("graphicEqualizerMnuChBL");
			this.mnuChL = $("graphicEqualizerMnuChL");
			this.mnuChBR = $("graphicEqualizerMnuChBR");
			this.mnuChR = $("graphicEqualizerMnuChR");
			this.mnuShowZones = $("graphicEqualizerMnuShowZones");
			this.mnuEditZones = $("graphicEqualizerMnuEditZones");
			this.mnuShowActual = $("graphicEqualizerMnuActual");
			this.canvas.onmousedown = function (e) { return GraphicalFilterEditor.prototype.canvas_OnMouseDown.apply(mthis, arguments); };
			this.canvas.onmousemove = this.document_OnMouseMove;
			this.element.onselectstart = cancelEvent;
			this.element.oncontextmenu = cancelEvent;
			this.canvas.oncontextmenu = cancelEvent;
			this.ctx = this.canvas.getContext("2d");

			this.rangeImage = this.ctx.createLinearGradient(0, 0, 1, this.canvas.height);
			this.rangeImage.addColorStop(0, "#ff0000");
			this.rangeImage.addColorStop(0.1875, "#ffff00");
			this.rangeImage.addColorStop(0.39453125, "#00ff00");
			this.rangeImage.addColorStop(0.60546875, "#00ffff");
			this.rangeImage.addColorStop(0.796875, "#0000ff");
			this.rangeImage.addColorStop(1, "#ff00ff");
			this.mnu.style.bottom = (this.element.clientHeight - this.canvas.height) + "px";
			this.btnMnu.onclick = function (e) { return GraphicalFilterEditor.prototype.btnMnu_Click.apply(mthis, arguments); };
			this.mnuChBL.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuChB_Click.apply(mthis, [e, 0]); };
			this.mnuChL.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuChLR_Click.apply(mthis, [e, 0]); };
			this.mnuChBR.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuChB_Click.apply(mthis, [e, 1]); };
			this.mnuChR.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuChLR_Click.apply(mthis, [e, 1]); };
			this.mnuShowZones.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuShowZones_Click.apply(mthis, arguments); };
			this.mnuEditZones.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuEditZones_Click.apply(mthis, arguments); };
			this.mnuShowActual.onclick = function (e) { return GraphicalFilterEditor.prototype.mnuShowActual_Click.apply(mthis, arguments); };
			this.labelImage = new Image();
			this.labelImage.onload = function () { return GraphicalFilterEditor.prototype.drawCurve.apply(mthis); };
			this.labelImage.onerror = this.labelImage.onload;
			this.labelImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAgCAYAAABpRpp6AAAAAXNSR0IArs4c6QAAAphJREFUWMPtl0tIVGEUx38zvdYZjVBEYBC1kB4EKa3auLEHtND4R6vaBC6MyVaVE0KWFlZE1qogOlEwgVQEgUKSVERFRhFEj4WLyESMFlKN0+YIl2HS6zyYgnvg8r+c73W+77vn+34XIovs3zBJWUnZubabX+SgDUAKWOeuV8BRM+svZAI5ringOzAEHDKzdwDxIoKtA+4Bv4FV/kwB9yVtLrRfM4t5XFVAJ9AIpEuxwklvnzKzLz6J48ADL2sKTG4L0AHUA5PAwCxBZ4EJSeeAU8CKUgRc7zoc8L10rcvZiQFgBNgKPAeWA7tm2L04sBg44K4ToQLOlxS+ZQAJ1/FA8fR7dcDXASwEWszsifs+Swo75jDwKFTAgeDCWr7606s9GPYblhTz2Ko9qR9KajKzdDGfxCiwzJNj1H1Vrl8D9Ra4/pxD4mWBX8CIpCSwD7gApONFBPzUdUPAtzGnDOCt6+oCx1nkmik26bqB7UBK0mv3HfOOewL1zgNXgC5J+33MMyGOzbhPsiuQC4Wfw2b22M/IGPDBnziwzcyGAvWuAq1ALfARuAhcC3EDZoBnntx7zOxyxAeRRRbxcJl5uNQTKCsPl8tKxsOSdvtNVgO8B46YWZ/DejewyZmi08wu5bQtGQ/HQwa7E7jht1k10A7cktQK9PsNlvA/kF5JzXl4eKXzcMIBf8ZrWdISoO2vPDwL+x52TZnZBHBbUq8zwySQNLMfknocupPAzbLy8Czsu971TcD3wvWOmY35+yfX2krz8DzX4OwbXe/mYd9MpXl4Gh9rfNuWAjtyVh9gbc6/XcV4uAe4DrRIavNTIQMcBE5KGvTka/f6pyvKw2ZmQIsD+5h31GBmZ4Fm7+wbsAbYa2Z9EQ//r/YHCOoe6W9/vj4AAAAASUVORK5CYII=";

			return this.canvas;
		}
		return null;
	},
	destroyControl: function () {
		if (this.ctx) {
			this.canvas = null;
			this.lblCursor = null;
			this.lblCurve = null;
			this.lblFrequency = null;
			this.btnMnu = null;
			this.mnu = null;
			this.mnuChBL = null;
			this.mnuChL = null;
			this.mnuChBR = null;
			this.mnuChR = null;
			this.mnuShowZones = null;
			this.mnuEditZones = null;
			this.mnuShowActual = null;
			this.ctx = null;
			this.rangeImage = null;
			this.labelImage = null;

			this.element.parentNode.removeChild(this.element);
			this.element = null;
		}
		return true;
	},
	clampY: function (y) {
		return ((y <= this.maximumChannelValueY) ? this.maximumChannelValueY :
						((y > this.minimumChannelValueY) ? (this.validYRangeHeight + 1) :
							y));
	},
	yToDB: function (y) {
		return ((y <= this.maximumChannelValueY) ? 40 :
						((y > this.minimumChannelValueY) ? -Infinity :
							GraphicalFilterEditor.prototype.lerp(this.maximumChannelValueY, 40, this.minimumChannelValueY, -40, y)));
	},
	yToMagnitude: function (y) {
		//40dB = 100
		//-40dB = 0.01
		//magnitude = 10 ^ (dB/20)
		//log a (x^p) = p * log a (x)
		//x^p = a ^ (p * log a (x))
		//10^p = e ^ (p * log e (10))
		return ((y <= this.maximumChannelValueY) ? 100 :
						((y > this.minimumChannelValueY) ? 0 :
							Math.exp(GraphicalFilterEditor.prototype.lerp(this.maximumChannelValueY, 2, this.minimumChannelValueY, -2, y) * Math.LN10))); //2 = 40dB/20
	},
	magnitudeToY: function (magnitude) {
		//40dB = 100
		//-40dB = 0.01
		return ((magnitude >= 100) ? this.maximumChannelValueY :
						((magnitude < 0.01) ? (this.validYRangeHeight + 1) :
							Math.round((this.zeroChannelValueY - (this.zeroChannelValueY * Math.log(magnitude) / Math.LN10 * 0.5)) - 0.4)));
	},
	visibleBinToZoneIndex: function (visibleBinIndex) {
		if (visibleBinIndex >= (this.visibleBinCount - 1)) {
			return this.equivalentZones.length - 1;
		} else if (visibleBinIndex > 0) {
			var i, z = this.equivalentZonesFrequencyCount;
			for (i = z.length - 1; i >= 0; i--) {
				if (visibleBinIndex >= z[i])
					return i;
			}
		}
		return 0;
	},
	visibleBinToFrequency: function (visibleBinIndex, returnGroup) {
		if (visibleBinIndex >= (this.visibleBinCount - 1)) {
			return (returnGroup ? [this.visibleFrequencies[this.visibleBinCount - 1], this.equivalentZones[this.equivalentZones.length - 1]] : this.visibleFrequencies[this.visibleBinCount - 1]);
		} else if (visibleBinIndex > 0) {
			if (returnGroup) {
				var i, z = this.equivalentZonesFrequencyCount;
				for (i = z.length - 1; i >= 0; i--) {
					if (visibleBinIndex >= z[i])
						return [this.visibleFrequencies[visibleBinIndex], this.equivalentZones[i]];
				}
			} else {
				return this.visibleFrequencies[visibleBinIndex];
			}
		}
		return (returnGroup ? [this.visibleFrequencies[0], this.equivalentZones[0]] : this.visibleFrequencies[0]);
	},
	btnMnu_Click: function (e) {
		if (e.button === 0) {
			if (this.mnu.style.display === "none") {
				this.mnu.style.display = "inline-block";
				this.btnMnu.replaceChild(document.createTextNode("▼"), this.btnMnu.firstChild);
			} else {
				this.mnu.style.display = "none";
				this.btnMnu.replaceChild(document.createTextNode("▲"), this.btnMnu.firstChild);
			}
		}
		return true;
	},
	checkMenu: function (mnu, chk) {
		mnu.firstChild.style.visibility = (chk ? "visible" : "hidden");
		return chk;
	},
	mnuChB_Click: function (e, channelIndex) {
		if (e.button === 0) {
			if (!this.sameFilterLR || this.currentChannelIndex !== channelIndex) {
				if (this.sameFilterLR) {
					this.currentChannelIndex = channelIndex;
					this.updateFilter();
					this.drawCurve();
				} else {
					this.sameFilterLR = true;
					this.copyFilter(channelIndex, 1 - channelIndex);
					if (this.currentChannelIndex !== channelIndex) {
						this.currentChannelIndex = channelIndex;
						this.drawCurve();
					}
				}
				this.checkMenu(this.mnuChBL, (channelIndex === 0));
				this.checkMenu(this.mnuChL, false);
				this.checkMenu(this.mnuChBR, (channelIndex === 1));
				this.checkMenu(this.mnuChR, false);
			}
		}
		return true;
	},
	mnuChLR_Click: function (e, channelIndex) {
		if (e.button === 0) {
			if (this.sameFilterLR || this.currentChannelIndex !== channelIndex) {
				if (this.sameFilterLR) {
					this.sameFilterLR = false;
					this.updateFilter(1 - this.currentChannelIndex);
				}
				if (this.currentChannelIndex !== channelIndex) {
					this.currentChannelIndex = channelIndex;
					this.drawCurve();
				}
				this.checkMenu(this.mnuChBL, false);
				this.checkMenu(this.mnuChL, (channelIndex === 0));
				this.checkMenu(this.mnuChBR, false);
				this.checkMenu(this.mnuChR, (channelIndex === 1));
			}
		}
		return true;
	},
	mnuShowZones_Click: function (e) {
		if (e.button === 0) {
			this.showZones = !this.showZones;
			this.checkMenu(this.mnuShowZones, this.showZones);
			this.drawCurve();
		}
		return true;
	},
	mnuEditZones_Click: function (e) {
		if (e.button === 0) {
			this.editZones = !this.editZones;
			this.checkMenu(this.mnuEditZones, this.editZones);
		}
		return true;
	},
	mnuShowActual_Click: function (e) {
		if (e.button === 0) {
			this.showActualResponse = !this.showActualResponse;
			this.checkMenu(this.mnuShowActual, this.showActualResponse);
			if (this.showActualResponse)
				this.updateActualChannelCurve();
			this.drawCurve();
		}
		return true;
	},
	changeZoneY: function (x, y) {
		var i = this.visibleBinToZoneIndex(x), ii = this.equivalentZonesFrequencyCount[i + 1],
			cy = this.clampY(y), curve = this.channelCurves[this.currentChannelIndex];
		for (i = this.equivalentZonesFrequencyCount[i]; i < ii; i++)
			curve[i] = cy;
		return true;
	},
	canvas_OnMouseDown: function (e) {
		if (e.button === 0 && !this.drawingMode) {
			var x, y;
			x = getElementLeftTop(this.canvas);
			y = e.pageY - x[1];
			x = e.pageX - x[0];
			if (x >= 0 && x < this.visibleBinCount) {
				this.drawingMode = 1;
				if (this.editZones) {
					this.changeZoneY(x, y);
				} else {
					this.channelCurves[this.currentChannelIndex][x] = this.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
				}
				this.drawCurve();
				this.canvas.onmousemove = null;
				document.addEventListener("mousemove", this.document_OnMouseMove, true);
				document.addEventListener("mouseup", this.document_OnMouseUp, true);
			}
		}
		return cancelEvent(e);
	},
	canvas_OnMouseUp: function (e) {
		if (this.drawingMode) {
			this.drawingMode = 0;
			this.updateFilter(this.currentChannelIndex);
			if (this.showActualResponse)
				this.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
			document.removeEventListener("mousemove", this.document_OnMouseMove, true);
			document.removeEventListener("mouseup", this.document_OnMouseUp, true);
			this.canvas.onmousemove = this.document_OnMouseMove;
		}
		return true;
	},
	canvas_OnMouseMove: function (e) {
		var x, y, delta, inc, count,
			curve = this.channelCurves[this.currentChannelIndex];
		x = getElementLeftTop(this.canvas);
		y = e.pageY - x[1];
		x = e.pageX - x[0];
		if (this.drawingMode || (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height)) {
			if (x < 0) x = 0;
			else if (x >= this.visibleBinCount) x = this.visibleBinCount - 1;
			this.lblCursor.replaceChild(document.createTextNode(GraphicalFilterEditor.prototype.formatDB(this.yToDB(y))), this.lblCursor.firstChild);
			this.lblCurve.replaceChild(document.createTextNode(GraphicalFilterEditor.prototype.formatDB(this.yToDB(curve[x]))), this.lblCurve.firstChild);
			this.lblFrequency.replaceChild(document.createTextNode(GraphicalFilterEditor.prototype.formatFrequency(this.visibleBinToFrequency(x, true))), this.lblFrequency.firstChild);
			if (this.drawingMode) {
				if (this.editZones) {
					this.changeZoneY(x, y);
				} else {
					if (Math.abs(x - this.lastDrawX) > 1) {
						delta = (y - this.lastDrawY) / Math.abs(x - this.lastDrawX);
						inc = ((x < this.lastDrawX) ? -1 : 1);
						y = this.lastDrawY + delta;
						count = Math.abs(x - this.lastDrawX) - 1;
						for (x = this.lastDrawX + inc; count > 0; x += inc, count--) {
							curve[x] = this.clampY(y);
							y += delta;
						}
					}
					curve[x] = this.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
				}
				this.drawCurve();
				return cancelEvent(e);
			}
		}
		return true;
	},
	copyFilter: function (sourceChannel, destinationChannel) {
		var i, src = this.filterKernel.getChannelData(sourceChannel), dst = this.filterKernel.getChannelData(destinationChannel);
		for (i = (this.filterLength - 1); i >= 0; i--)
			dst[i] = src[i];
		this.convolver.buffer = this.filterKernel;
		return true;
	},
	updateFilter: function (channelIndex) {
		var ci = ((channelIndex === undefined) ? this.currentChannelIndex : channelIndex), i, ii, k, freq, filterLength = this.filterLength,
			curve = this.channelCurves[ci], valueCount = this.visibleBinCount, bw = this.rfft.bandwidth, lerp = GraphicalFilterEditor.prototype.lerp,
			filterLength2 = (filterLength >>> 1), filter = this.rfft.trans, sin = Math.sin, cos = Math.cos, avg, avgCount,
			visibleFrequencies = this.visibleFrequencies,
		//M = ((FFT length/2) - 1)
			M_HALF_PI_FFTLEN2 = (filterLength2 - 1) * 0.5 * Math.PI / filterLength2;
		i = 1;
		ii = 0;
		for (; ; ) {
			freq = bw * i;
			if (freq >= visibleFrequencies[0]) break;
			filter[i] = this.yToMagnitude(curve[0]);
			i++;
		}
		while (bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii]) && i < filterLength2 && ii < (valueCount - 1)) {
			freq = bw * i;
			avg = 0;
			avgCount = 0;
			do {
				avg += curve[ii];
				avgCount++;
				ii++;
			} while (freq > visibleFrequencies[ii] && ii < (valueCount - 1));
			filter[i] = this.yToMagnitude(avg / avgCount);
			i++;
		}
		for (; i < filterLength2; i++) {
			freq = bw * i;
			if (freq >= visibleFrequencies[valueCount - 1]) {
				filter[i] = this.yToMagnitude(curve[valueCount - 1]);
			} else {
				while (ii < (valueCount - 1) && freq > visibleFrequencies[ii + 1])
					ii++;
				filter[i] = this.yToMagnitude(lerp(visibleFrequencies[ii], curve[ii], visibleFrequencies[ii + 1], curve[ii + 1], freq));
			}
		}
		//convert the coordinates from polar to rectangular
		//dc and nyquist are purely real (for dc, cos(-k) = 1,
		//as for nyquist, cos(-k) = 0) so do not bother with them in here
		filter[0] = (filter[1] >= 1 ? 1 : filter[1]); //make sure dc has no gain
		filter[filterLength2] = 0;
		for (i = 1; i < filterLength2; i++) {
			//               -k.j
			//polar = Mag . e
			//
			//where:
			//k = (M / 2) * pi * i / (fft length / 2)
			//i = index varying from 0 to (fft length / 2)
			//
			//rectangular:
			//real = Mag . cos(-k)
			//imag = Mag . sin(-k)
			k = M_HALF_PI_FFTLEN2 * i;
			filter[filterLength - i] = (filter[i] * sin(-k));
			filter[i] *= cos(-k);
		}
		filter = this.filterKernel.getChannelData(ci);
		this.rfft.inverse(filter);
		if (this.sameFilterLR) {
			//copy the filter to the other channel
			return this.copyFilter(ci, 1 - ci);
		} else if (channelIndex === undefined) {
			//update the other channel as well
			return this.updateFilter(1 - ci);
		}
		this.convolver.buffer = this.filterKernel;
		return true;
	},
	updateActualChannelCurve: function (channelIndex) {
		var ci = ((channelIndex === undefined) ? this.currentChannelIndex : channelIndex), freq, i, ii, avg, avgCount, filterLength = this.filterLength,
			curve = this.actualChannelCurves[ci], valueCount = this.visibleBinCount, bw = this.rfft.bandwidth,
			filterLength2 = (filterLength >>> 1), cos = Math.cos, lerp = GraphicalFilterEditor.prototype.lerp,
			visibleFrequencies = this.visibleFrequencies,
			filter = this.filterKernel.getChannelData(ci), tmp = this.tmpActual,
			M = (filterLength2 - 1), PI2_M = 2 * Math.PI / M;
		if (!tmp) {
			tmp = new Float32Array(filterLength);
			this.tmpActual = tmp;
		}
		//it is not possible to know what kind of window the browser will use,
		//so make an assumption here... Blackman window!
		//...at least it is the one I used, back in C++ times :)
		for (i = M; i >= 0; i--) {
			//Hanning window
			//tmp[i] = filter[i] * (0.5 - (0.5 * cos(PI2_M * i)));
			//Hamming window
			//tmp[i] = filter[i] * (0.54 - (0.46 * cos(PI2_M * i)));
			//Blackman window
			tmp[i] = filter[i] * (0.42 - (0.5 * cos(PI2_M * i)) + (0.08 * cos(2 * PI2_M * i)));
		}
		//pad with zeroes
		for (i = filterLength - 1; i > M; i--) {
			tmp[i] = 0;
		}
		this.rfft.forward(tmp);
		this.rfft.calculateSpectrum(tmp);
		//tmp now contains (filterLength2 + 1) magnitudes
		i = 0;
		ii = 0;
		while (ii < (valueCount - 1) && i < filterLength2 && bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii])) {
			freq = bw * i;
			while (i < filterLength2 && (freq + bw) < visibleFrequencies[ii]) {
				i++;
				freq = bw * i;
			}
			curve[ii] = this.magnitudeToY(lerp(freq, tmp[i], freq + bw, tmp[i + 1], visibleFrequencies[ii]));
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
			curve[ii] = this.magnitudeToY(avg / avgCount);
			ii++;
		}
		i = (((this.rfft.sampleRate >>> 1) >= visibleFrequencies[valueCount - 1]) ? curve[ii - 1] : (this.validYRangeHeight + 1));
		for (; ii < valueCount; ii++)
			curve[ii] = i;
		if (!this.sameFilterLR && (channelIndex === undefined))
			return this.updateActualChannelCurve(1 - ci);
		return true;
	},
	setFilterLength: function (newFilterLength) {
		if (newFilterLength !== this.filterLength) {
			this.filterLength = newFilterLength;
			this.binCount = (newFilterLength >>> 1) + 1;
			this.filterKernel = audioContext.createBuffer(2, newFilterLength, this.rfft.sampleRate);
			this.rfft = new RFFT(newFilterLength, this.rfft.sampleRate);
			this.updateFilter();
			if (this.showActualResponse)
				this.updateActualChannelCurve();
			this.drawCurve();
			return true;
		}
		return false;
	},
	setSampleRate: function (newSampleRate) {
		if (newSampleRate !== this.rfft.sampleRate) {
			this.rfft.setSampleRate(newSampleRate);
			this.filterKernel = audioContext.createBuffer(2, this.filterLength, newSampleRate);
			this.updateFilter();
			if (this.showActualResponse)
				this.updateActualChannelCurve();
			this.drawCurve();
			return true;
		}
		return false;
	},
	drawCurve: function () {
		//all the 0.5's here are because of this explanation:
		//http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		//"Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		//over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		//results in two lines that get drawn on the canvas.
		var i, x, y, ctx = this.ctx, canvas = this.canvas, widthMinus1 = this.visibleBinCount - 1,
			curve = this.channelCurves[this.currentChannelIndex];
		if (!ctx) return false;
		ctx.fillStyle = "#303030";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#5a5a5a";
		ctx.beginPath();
		x = canvas.width + 1.5;
		y = this.zeroChannelValueY + 0.5;
		ctx.moveTo(x, y);
		while (x > 0) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();
		ctx.drawImage(this.labelImage, 0, 0, 44, 16, canvas.width - 44, this.zeroChannelValueY - 16, 44, 16);
		ctx.beginPath();
		x = canvas.width - 1.5;
		y = this.validYRangeHeight + 0.5;
		ctx.moveTo(x, y);
		while (x > 0) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();
		ctx.drawImage(this.labelImage, 0, 16, 44, 16, canvas.width - 44, this.validYRangeHeight - 16, 44, 16);
		if (this.showZones) {
			for (i = this.equivalentZonesFrequencyCount.length - 2; i > 0; i--) {
				x = this.equivalentZonesFrequencyCount[i] + 0.5;
				y = this.maximumChannelValueY + 0.5;
				ctx.beginPath();
				ctx.moveTo(x, y);
				while (y < this.minimumChannelValueY) {
					ctx.lineTo(x, y + 4);
					y += 10;
					ctx.moveTo(x, y);
				}
				ctx.stroke();
			}
		}
		ctx.strokeStyle = ((this.showActualResponse && !this.drawingMode) ? "#707070" : this.rangeImage);
		ctx.beginPath();
		ctx.moveTo(0.5, curve[0] + 0.5);
		for (x = 1; x < widthMinus1; x++)
			ctx.lineTo(x + 0.5, curve[x] + 0.5);
		//just to fill up the last pixel!
		ctx.lineTo(x + 1, curve[x] + 0.5);
		ctx.stroke();
		if (this.showActualResponse && !this.drawingMode) {
			curve = this.actualChannelCurves[this.currentChannelIndex];
			ctx.strokeStyle = this.rangeImage;
			ctx.beginPath();
			ctx.moveTo(0.5, curve[0] + 0.5);
			for (x = 1; x < widthMinus1; x++)
				ctx.lineTo(x + 0.5, curve[x] + 0.5);
			//just to fill up the last pixel!
			ctx.lineTo(x + 1, curve[x] + 0.5);
			ctx.stroke();
		}
		return true;
	}
};
