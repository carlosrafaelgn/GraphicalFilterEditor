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
"use strict";

function GraphicalFilterEditorControl(filterLength, audioContext) {
	var mthis = this;

	this.filter = new GraphicalFilterEditor(filterLength, audioContext);
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
	this.mnuNormalizeCurves = null;
	this.mnuShowActual = null;
	this.lblCursor = null;
	this.lblCurve = null;
	this.lblFrequency = null;
	this.showZones = false;
	this.editZones = false;
	this.isActualChannelCurveNeeded = true;
	this.currentChannelIndex = 0;
	this.isSameFilterLR = true;
	this.drawingMode = 0;
	this.lastDrawX = 0;
	this.lastDrawY = 0;
	this.drawOffsetX = 0;
	this.drawOffsetY = 0;
	this.document_OnMouseMove = function (e) { return GraphicalFilterEditorControl.prototype.canvas_OnMouseMove.apply(mthis, arguments); };
	this.document_OnMouseUp = function (e) { return GraphicalFilterEditorControl.prototype.canvas_OnMouseUp.apply(mthis, arguments); };

	seal$(this);
}

GraphicalFilterEditorControl.prototype = {
	formatDB: function (dB) {
		if (dB < -40) return "-Inf.";
		return ((dB < 0) ? dB.toFixed(2) : ((dB === 0) ? "-" + dB.toFixed(2) : "+" + dB.toFixed(2)));
	},
	formatFrequency: function (frequencyAndEquivalent) {
		return frequencyAndEquivalent[0] + " Hz (" + ((frequencyAndEquivalent[1] < 1000) ? (frequencyAndEquivalent[1] + " Hz") : ((frequencyAndEquivalent[1] / 1000) + " kHz")) + ")";
	},
	createControl: function (placeholder) {
		if (!this.ctx) {
			var mthis = this, lbl,
				createLabel = function () {
				},
				createMenuSep = function () {
					var s = document.createElement("div");
					s.className = "GEMNUSEP";
					return s;
				},
				createMenuLabel = function (text) {
					var l = document.createElement("div");
					l.className = "GEMNULBL";
					l.appendChild(document.createTextNode(text));
					return l;
				},
				createMenuItem = function (text, checkable, checked, radio, clickHandler) {
					var i = document.createElement("div"), s;
					i.className = "GEMNUIT GECLK";
					if (checkable) {
						s = document.createElement("span");
						s.appendChild(document.createTextNode(radio ? "\u25CF " : "\u25A0 "));
						if (!checked)
							s.style.visibility = "hidden";
						i.appendChild(s);
					}
					i.appendChild(document.createTextNode(text));
					if (clickHandler)
						attachMouse(i, "click", clickHandler);
					return i;
				};

			this.element = placeholder;
			placeholder.className = "GE";
			if (!_isTouch) attachMouse(placeholder, "mousedown", GraphicalFilterEditorControl.prototype.misc_OnMouseDown);
			placeholder.addEventListener("contextmenu", cancelEvent);

			this.canvas = document.createElement("canvas");
			this.canvas.setAttribute("width", "512");
			this.canvas.setAttribute("height", "260");
			this.canvas.style.margin = "0px";
			this.canvas.style.display = "block";
			this.canvas.style.cursor = "crosshair";
			attachMouse(this.canvas, "mousedown", function (e) { return GraphicalFilterEditorControl.prototype.canvas_OnMouseDown.apply(mthis, arguments); });
			attachMouse(this.canvas, "mousemove", this.document_OnMouseMove);
			this.canvas.addEventListener("contextmenu", cancelEvent);
			placeholder.appendChild(this.canvas);
			this.ctx = this.canvas.getContext("2d");

			lbl = document.createElement("div");
			lbl.className = "GELBL";
			lbl.style.width = "9em";
			lbl.appendChild(document.createTextNode("Cursor: "));
			lbl.appendChild(this.lblCursor = document.createElement("span"));
			lbl.appendChild(document.createTextNode(" dB"));
			this.lblCursor.appendChild(document.createTextNode("-0.00"));
			placeholder.appendChild(lbl);

			lbl = document.createElement("div");
			lbl.className = "GELBL";
			lbl.style.width = "9em";
			lbl.appendChild(document.createTextNode("Curve: "));
			lbl.appendChild(this.lblCurve = document.createElement("span"));
			lbl.appendChild(document.createTextNode(" dB"));
			this.lblCurve.appendChild(document.createTextNode("-0.00"));
			placeholder.appendChild(lbl);

			lbl = document.createElement("div");
			lbl.className = "GELBL";
			lbl.appendChild(document.createTextNode("Frequency: "));
			lbl.appendChild(this.lblFrequency = document.createElement("span"));
			this.lblFrequency.appendChild(document.createTextNode("0 Hz (31 Hz)"));
			placeholder.appendChild(lbl);

			this.btnMnu = document.createElement("div");
			this.btnMnu.className = "GEBTN GECLK";
			this.btnMnu.appendChild(document.createTextNode("\u25B2"));
			attachMouse(this.btnMnu, "click", function (e) { return GraphicalFilterEditorControl.prototype.btnMnu_Click.apply(mthis, arguments); });
			placeholder.appendChild(this.btnMnu);

			this.mnu = document.createElement("div");
			this.mnu.style.bottom = (placeholder.clientHeight - 260) + "px";
			this.mnu.className = "GEMNU";
			this.mnu.style.display = "none";
			this.mnu.appendChild(createMenuLabel("Same curve for both channels"));
			this.mnu.appendChild(this.mnuChBL = createMenuItem("Use left curve", true, true, true, function (e) { return GraphicalFilterEditorControl.prototype.mnuChB_Click.apply(mthis, [e, 0]); }));
			this.mnu.appendChild(this.mnuChBR = createMenuItem("Use right curve", true, false, true, function (e) { return GraphicalFilterEditorControl.prototype.mnuChB_Click.apply(mthis, [e, 1]); }));
			this.mnu.appendChild(createMenuSep());
			this.mnu.appendChild(createMenuLabel("One curve for each channel"));
			this.mnu.appendChild(this.mnuChL = createMenuItem("Show left curve", true, false, true, function (e) { return GraphicalFilterEditorControl.prototype.mnuChLR_Click.apply(mthis, [e, 0]); }));
			this.mnu.appendChild(this.mnuChR = createMenuItem("Show right curve", true, false, true, function (e) { return GraphicalFilterEditorControl.prototype.mnuChLR_Click.apply(mthis, [e, 1]); }));
			this.mnu.appendChild(createMenuSep());
			this.mnu.appendChild(this.mnuShowZones = createMenuItem("Show zones", true, false, false, function () { return GraphicalFilterEditorControl.prototype.mnuShowZones_Click.apply(mthis, arguments); }));
			this.mnu.appendChild(this.mnuEditZones = createMenuItem("Edit by zones", true, false, false, function () { return GraphicalFilterEditorControl.prototype.mnuEditZones_Click.apply(mthis, arguments); }));
			this.mnu.appendChild(createMenuSep());
			this.mnu.appendChild(this.mnuNormalizeCurves = createMenuItem("Normalize curves", true, false, false, function () { return GraphicalFilterEditorControl.prototype.mnuNormalizeCurves_Click.apply(mthis, arguments); }));
			this.mnu.appendChild(this.mnuShowActual = createMenuItem("Show actual response", true, true, false, function () { return GraphicalFilterEditorControl.prototype.mnuShowActual_Click.apply(mthis, arguments); }));
			placeholder.appendChild(this.mnu);

			this.rangeImage = this.ctx.createLinearGradient(0, 0, 1, this.canvas.height);
			this.rangeImage.addColorStop(0, "#ff0000");
			this.rangeImage.addColorStop(0.1875, "#ffff00");
			this.rangeImage.addColorStop(0.39453125, "#00ff00");
			this.rangeImage.addColorStop(0.60546875, "#00ffff");
			this.rangeImage.addColorStop(0.796875, "#0000ff");
			this.rangeImage.addColorStop(1, "#ff00ff");
			this.labelImage = new Image();
			this.labelImage.addEventListener("load", function () { return GraphicalFilterEditorControl.prototype.drawCurve.apply(mthis); });
			this.labelImage.addEventListener("error", function () { return GraphicalFilterEditorControl.prototype.drawCurve.apply(mthis); });
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
			this.mnuNormalizeCurves = null;
			this.mnuShowActual = null;
			this.ctx = null;
			this.rangeImage = null;
			this.labelImage = null;
			this.element.parentNode.removeChild(this.element);
			this.element = null;
		}
		return true;
	},
	btnMnu_Click: function (e) {
		if (!e.button) {
			if (this.mnu.style.display === "none") {
				this.mnu.style.display = "inline-block";
				this.btnMnu.replaceChild(document.createTextNode("\u25BC"), this.btnMnu.firstChild);
			} else {
				this.mnu.style.display = "none";
				this.btnMnu.replaceChild(document.createTextNode("\u25B2"), this.btnMnu.firstChild);
			}
		}
		return true;
	},
	checkMenu: function (mnu, chk) {
		mnu.firstChild.style.visibility = (chk ? "visible" : "hidden");
		return chk;
	},
	mnuChB_Click: function (e, channelIndex) {
		if (!e.button) {
			if (!this.isSameFilterLR || this.currentChannelIndex !== channelIndex) {
				if (this.isSameFilterLR) {
					this.currentChannelIndex = channelIndex;
					this.filter.updateFilter(channelIndex, true, true);
					if (this.isActualChannelCurveNeeded)
						this.filter.updateActualChannelCurve(channelIndex);
					this.drawCurve();
				} else {
					this.isSameFilterLR = true;
					this.filter.copyFilter(channelIndex, 1 - channelIndex);
					if (this.currentChannelIndex !== channelIndex) {
						this.currentChannelIndex = channelIndex;
						if (this.isActualChannelCurveNeeded)
							this.filter.updateActualChannelCurve(channelIndex);
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
		if (!e.button) {
			if (this.isSameFilterLR || this.currentChannelIndex !== channelIndex) {
				if (this.isSameFilterLR) {
					this.isSameFilterLR = false;
					this.filter.updateFilter(1 - this.currentChannelIndex, false, false);
				}
				if (this.currentChannelIndex !== channelIndex) {
					this.currentChannelIndex = channelIndex;
					if (this.isActualChannelCurveNeeded)
						this.filter.updateActualChannelCurve(channelIndex);
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
		if (!e.button) {
			this.showZones = !this.showZones;
			this.checkMenu(this.mnuShowZones, this.showZones);
			this.drawCurve();
		}
		return true;
	},
	mnuEditZones_Click: function (e) {
		if (!e.button) {
			this.editZones = !this.editZones;
			this.checkMenu(this.mnuEditZones, this.editZones);
		}
		return true;
	},
	mnuNormalizeCurves_Click: function (e) {
		if (!e.button) {
			this.filter.changeIsNormalized(!this.filter.isNormalized, this.currentChannelIndex, this.isSameFilterLR);
			this.checkMenu(this.mnuNormalizeCurves, this.filter.isNormalized);
			if (this.isActualChannelCurveNeeded) {
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
				this.drawCurve();
			}
		}
		return true;
	},
	mnuShowActual_Click: function (e) {
		if (!e.button) {
			this.isActualChannelCurveNeeded = !this.isActualChannelCurveNeeded;
			this.checkMenu(this.mnuShowActual, this.isActualChannelCurveNeeded);
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
		}
		return true;
	},
	misc_OnMouseDown: function (e) {
		return (!e.button ? cancelEvent(e) : true);
	},
	canvas_OnMouseDown: function (e) {
		if (!e.button) {
			if (!this.drawingMode) {
				var x, y;
				x = leftTop(this.canvas);
				y = ((e.pageY - x[1]) | 0);
				x = ((e.pageX - x[0]) | 0);
				if (x >= 0 && x < this.filter.visibleBinCount) {
					this.drawingMode = 1;
					if (this.editZones) {
						this.filter.changeZoneY(this.currentChannelIndex, x, y);
					} else {
						this.filter.channelCurves[this.currentChannelIndex][x] = this.filter.clampY(y);
						this.lastDrawX = x;
						this.lastDrawY = y;
					}
					this.drawCurve();
					detachMouse(this.canvas, "mousemove", this.document_OnMouseMove);
					attachMouse(document, "mousemove", this.document_OnMouseMove, true);
					attachMouse(document, "mouseup", this.document_OnMouseUp, true);
				}
			}
			return cancelEvent(e);
		}
		return true;
	},
	canvas_OnMouseUp: function (e) {
		if (this.drawingMode) {
			this.drawingMode = 0;
			this.filter.updateFilter(this.currentChannelIndex, this.isSameFilterLR, false);
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
			detachMouse(document, "mousemove", this.document_OnMouseMove, true);
			detachMouse(document, "mouseup", this.document_OnMouseUp, true);
			attachMouse(this.canvas, "mousemove", this.document_OnMouseMove);
		}
		return true;
	},
	canvas_OnMouseMove: function (e) {
		var x, y, delta, inc, count, curve = this.filter.channelCurves[this.currentChannelIndex];
		x = leftTop(this.canvas);
		y = ((e.pageY - x[1]) | 0);
		x = ((e.pageX - x[0]) | 0);
		if (this.drawingMode || (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height)) {
			if (x < 0) x = 0;
			else if (x >= GraphicalFilterEditor.prototype.visibleBinCount) x = GraphicalFilterEditor.prototype.visibleBinCount - 1;
			if (this.drawingMode) {
				if (this.editZones) {
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
				} else {
					if (Math.abs(x - this.lastDrawX) > 1) {
						delta = (y - this.lastDrawY) / Math.abs(x - this.lastDrawX);
						inc = ((x < this.lastDrawX) ? -1 : 1);
						y = this.lastDrawY + delta;
						count = Math.abs(x - this.lastDrawX) - 1;
						for (x = this.lastDrawX + inc; count > 0; x += inc, count--) {
							curve[x] = GraphicalFilterEditor.prototype.clampY(y);
							y += delta;
						}
					}
					curve[x] = GraphicalFilterEditor.prototype.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
				}
				this.drawCurve();
			} else if (this.isActualChannelCurveNeeded) {
				curve = this.filter.actualChannelCurve;
			}
			this.lblCursor.replaceChild(document.createTextNode(GraphicalFilterEditorControl.prototype.formatDB(GraphicalFilterEditor.prototype.yToDB(y))), this.lblCursor.firstChild);
			this.lblCurve.replaceChild(document.createTextNode(GraphicalFilterEditorControl.prototype.formatDB(GraphicalFilterEditor.prototype.yToDB(curve[x]))), this.lblCurve.firstChild);
			this.lblFrequency.replaceChild(document.createTextNode(GraphicalFilterEditorControl.prototype.formatFrequency(GraphicalFilterEditor.prototype.visibleBinToFrequency(x, true))), this.lblFrequency.firstChild);
			if (this.drawingMode) return cancelEvent(e);
		}
		return true;
	},
	changeFilterLength: function (newFilterLength) {
		if (this.filter.changeFilterLength(newFilterLength, this.currentChannelIndex, this.isSameFilterLR)) {
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
			return true;
		}
		return false;
	},
	changeSampleRate: function (newSampleRate) {
		if (this.filter.changeSampleRate(newSampleRate, this.currentChannelIndex, this.isSameFilterLR)) {
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
			return true;
		}
		return false;
	},
	changeAudioContext: function (newAudioContext) {
		return this.filter.changeAudioContext(newAudioContext, this.currentChannelIndex, this.isSameFilterLR);
	},
	drawCurve: function () {
		//all the 0.5's here are because of this explanation:
		//http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		//"Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		//over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		//results in two lines that get drawn on the canvas.
		var i, x, y, ctx = this.ctx, canvas = this.canvas, widthMinus1 = GraphicalFilterEditor.prototype.visibleBinCount - 1,
			curve = this.filter.channelCurves[this.currentChannelIndex];
		if (!ctx) return false;
		ctx.fillStyle = "#303030";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#5a5a5a";
		ctx.beginPath();
		x = canvas.width + 1.5;
		y = GraphicalFilterEditor.prototype.zeroChannelValueY + 0.5;
		ctx.moveTo(x, y);
		while (x > 0) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();
		ctx.drawImage(this.labelImage, 0, 0, 44, 16, canvas.width - 44, GraphicalFilterEditor.prototype.zeroChannelValueY - 16, 44, 16);
		ctx.beginPath();
		x = canvas.width - 1.5;
		y = GraphicalFilterEditor.prototype.validYRangeHeight + 0.5;
		ctx.moveTo(x, y);
		while (x > 0) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();
		ctx.drawImage(this.labelImage, 0, 16, 44, 16, canvas.width - 44, GraphicalFilterEditor.prototype.validYRangeHeight - 16, 44, 16);
		if (this.showZones) {
			for (i = GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount.length - 2; i > 0; i--) {
				x = GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount[i] + 0.5;
				y = GraphicalFilterEditor.prototype.maximumChannelValueY + 0.5;
				ctx.beginPath();
				ctx.moveTo(x, y);
				while (y < GraphicalFilterEditor.prototype.minimumChannelValueY) {
					ctx.lineTo(x, y + 4);
					y += 10;
					ctx.moveTo(x, y);
				}
				ctx.stroke();
			}
		}
		ctx.strokeStyle = ((this.isActualChannelCurveNeeded && !this.drawingMode) ? "#707070" : this.rangeImage);
		ctx.beginPath();
		ctx.moveTo(0.5, curve[0] + 0.5);
		for (x = 1; x < widthMinus1; x++)
			ctx.lineTo(x + 0.5, curve[x] + 0.5);
		//just to fill up the last pixel!
		ctx.lineTo(x + 1, curve[x] + 0.5);
		ctx.stroke();
		if (this.isActualChannelCurveNeeded && !this.drawingMode) {
			curve = this.filter.actualChannelCurve;
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
if (!("ontouchend" in document)) {
	//do not use hover effect on tablets and other touch devices
	var s = document.createElement("link");
	s.setAttribute("rel", "stylesheet");
	s.setAttribute("href", "GraphicalFilterEditorHover.css");
	document.head.appendChild(s);
}
