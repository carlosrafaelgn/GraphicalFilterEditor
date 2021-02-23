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

"use strict";

class GraphicalFilterEditorControl {
	public static readonly ControlWidth = GraphicalFilterEditor.VisibleBinCount;
	public static readonly ControlHeight = GraphicalFilterEditor.ValidYRangeHeight + 5;

	public readonly filter: GraphicalFilterEditor;
	public readonly element: HTMLDivElement;

	private readonly pointerHandler: PointerHandler;
	private readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly rangeImage: CanvasGradient;
	private readonly labelImage: HTMLImageElement;
	private readonly btnMnu: HTMLDivElement;
	private readonly mnu: HTMLDivElement;
	private readonly mnuChBL: HTMLDivElement;
	private readonly mnuChL: HTMLDivElement;
	private readonly mnuChBR: HTMLDivElement;
	private readonly mnuChR: HTMLDivElement;
	private readonly mnuShowZones: HTMLDivElement;
	private readonly mnuEditZones: HTMLDivElement;
	private readonly mnuNormalizeCurves: HTMLDivElement;
	private readonly mnuShowActual: HTMLDivElement;
	private readonly lblCursor: HTMLSpanElement;
	private readonly lblCurve: HTMLSpanElement;
	private readonly lblFrequency: HTMLSpanElement;

	private showZones = false;
	private editZones = false;
	private isActualChannelCurveNeeded = true;
	private currentChannelIndex = 0;
	private isSameFilterLR = true;
	private drawingMode = 0;
	private lastDrawX = 0;
	private lastDrawY = 0;
	private drawOffsetX = 0;
	private drawOffsetY = 0;

	private boundMouseMove: any;

	public constructor(element: HTMLDivElement, filterLength: number, audioContext: AudioContext, convolverCallback: ConvolverCallback) {
		if (filterLength < 8 || (filterLength & (filterLength - 1)))
			throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";

		this.filter = new GraphicalFilterEditor(filterLength, audioContext, convolverCallback);

		const createMenuSep = () => {
				const s = document.createElement("div");
				s.className = "GEMNUSEP";
				return s;
			},
			createMenuLabel = (text: string) => {
				const l = document.createElement("div");
				l.className = "GEMNULBL";
				l.appendChild(document.createTextNode(text));
				return l;
			},
			createMenuItem = (text: string, checkable: boolean, checked: boolean, radio: boolean, clickHandler: (ev: MouseEvent) => any) => {
				const i = document.createElement("div");
				i.className = "GEMNUIT GECLK";
				if (checkable) {
					const s = document.createElement("span");
					s.appendChild(document.createTextNode(radio ? "\u25CF " : "\u25A0 "));
					if (!checked)
						s.style.visibility = "hidden";
					i.appendChild(s);
				}
				i.appendChild(document.createTextNode(text));
				if (clickHandler)
					i.onclick = clickHandler;
				return i;
			};

		this.element = element;
		element.className = "GE";

		this.boundMouseMove = this.mouseMove.bind(this);

		this.canvas = document.createElement("canvas");
		this.canvas.className = "GECV";
		this.canvas.width = GraphicalFilterEditorControl.ControlWidth;
		this.canvas.height = GraphicalFilterEditorControl.ControlHeight;
		this.canvas.addEventListener("mousemove", this.boundMouseMove);
		element.appendChild(this.canvas);

		const ctx = this.canvas.getContext("2d", { alpha: false });
		if (!ctx)
			throw new Error("Null canvas context");
		this.ctx = ctx;

		this.pointerHandler = new PointerHandler(this.canvas, this.mouseDown.bind(this), this.mouseMove.bind(this), this.mouseUp.bind(this));

		element.oncontextmenu = cancelEvent;
		this.canvas.oncontextmenu = cancelEvent;

		let lbl = document.createElement("div");
		lbl.className = "GELBL";
		lbl.style.width = "9em";
		lbl.appendChild(document.createTextNode("Cursor: "));
		lbl.appendChild(this.lblCursor = document.createElement("span"));
		lbl.appendChild(document.createTextNode(" dB"));
		this.lblCursor.appendChild(document.createTextNode("-0.00"));
		element.appendChild(lbl);

		lbl = document.createElement("div");
		lbl.className = "GELBL";
		lbl.style.width = "9em";
		lbl.appendChild(document.createTextNode("Curve: "));
		lbl.appendChild(this.lblCurve = document.createElement("span"));
		lbl.appendChild(document.createTextNode(" dB"));
		this.lblCurve.appendChild(document.createTextNode("-0.00"));
		element.appendChild(lbl);

		lbl = document.createElement("div");
		lbl.className = "GELBL";
		lbl.appendChild(document.createTextNode("Frequency: "));
		lbl.appendChild(this.lblFrequency = document.createElement("span"));
		this.lblFrequency.appendChild(document.createTextNode("0 Hz (31 Hz)"));
		element.appendChild(lbl);

		this.btnMnu = document.createElement("div");
		this.btnMnu.className = "GEBTN GECLK";
		this.btnMnu.appendChild(document.createTextNode("\u25B2"));
		this.btnMnu.onclick = this.btnMnu_Click.bind(this);
		element.appendChild(this.btnMnu);

		this.mnu = document.createElement("div");
		this.mnu.className = "GEMNU";
		this.mnu.style.display = "none";
		this.mnu.appendChild(createMenuLabel("Same curve for both channels"));
		this.mnu.appendChild(this.mnuChBL = createMenuItem("Use left curve", true, true, true, this.mnuChB_Click.bind(this, 0)));
		this.mnu.appendChild(this.mnuChBR = createMenuItem("Use right curve", true, false, true, this.mnuChB_Click.bind(this, 1)));
		this.mnu.appendChild(createMenuSep());
		this.mnu.appendChild(createMenuLabel("One curve for each channel"));
		this.mnu.appendChild(this.mnuChL = createMenuItem("Show left curve", true, false, true, this.mnuChLR_Click.bind(this, 0)));
		this.mnu.appendChild(this.mnuChR = createMenuItem("Show right curve", true, false, true, this.mnuChLR_Click.bind(this, 1)));
		this.mnu.appendChild(createMenuSep());
		this.mnu.appendChild(this.mnuShowZones = createMenuItem("Show zones", true, false, false, this.mnuShowZones_Click.bind(this)));
		this.mnu.appendChild(this.mnuEditZones = createMenuItem("Edit by zones", true, false, false, this.mnuEditZones_Click.bind(this)));
		this.mnu.appendChild(createMenuSep());
		this.mnu.appendChild(this.mnuNormalizeCurves = createMenuItem("Normalize curves", true, false, false, this.mnuNormalizeCurves_Click.bind(this)));
		this.mnu.appendChild(this.mnuShowActual = createMenuItem("Show actual response", true, true, false, this.mnuShowActual_Click.bind(this)));
		element.appendChild(this.mnu);

		this.rangeImage = this.ctx.createLinearGradient(0, 0, 1, this.canvas.height);
		this.rangeImage.addColorStop(0, "#ff0000");
		this.rangeImage.addColorStop(0.1875, "#ffff00");
		this.rangeImage.addColorStop(0.39453125, "#00ff00");
		this.rangeImage.addColorStop(0.60546875, "#00ffff");
		this.rangeImage.addColorStop(0.796875, "#0000ff");
		this.rangeImage.addColorStop(1, "#ff00ff");
		const boundDrawCurve = this.drawCurve.bind(this);
		this.labelImage = new Image();
		this.labelImage.addEventListener("load", boundDrawCurve);
		this.labelImage.addEventListener("error", boundDrawCurve);
		this.labelImage.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAgCAYAAABpRpp6AAAAAXNSR0IArs4c6QAAAphJREFUWMPtl0tIVGEUx38zvdYZjVBEYBC1kB4EKa3auLEHtND4R6vaBC6MyVaVE0KWFlZE1qogOlEwgVQEgUKSVERFRhFEj4WLyESMFlKN0+YIl2HS6zyYgnvg8r+c73W+77vn+34XIovs3zBJWUnZubabX+SgDUAKWOeuV8BRM+svZAI5ringOzAEHDKzdwDxIoKtA+4Bv4FV/kwB9yVtLrRfM4t5XFVAJ9AIpEuxwklvnzKzLz6J48ADL2sKTG4L0AHUA5PAwCxBZ4EJSeeAU8CKUgRc7zoc8L10rcvZiQFgBNgKPAeWA7tm2L04sBg44K4ToQLOlxS+ZQAJ1/FA8fR7dcDXASwEWszsifs+Swo75jDwKFTAgeDCWr7606s9GPYblhTz2Ko9qR9KajKzdDGfxCiwzJNj1H1Vrl8D9Ra4/pxD4mWBX8CIpCSwD7gApONFBPzUdUPAtzGnDOCt6+oCx1nkmik26bqB7UBK0mv3HfOOewL1zgNXgC5J+33MMyGOzbhPsiuQC4Wfw2b22M/IGPDBnziwzcyGAvWuAq1ALfARuAhcC3EDZoBnntx7zOxyxAeRRRbxcJl5uNQTKCsPl8tKxsOSdvtNVgO8B46YWZ/DejewyZmi08wu5bQtGQ/HQwa7E7jht1k10A7cktQK9PsNlvA/kF5JzXl4eKXzcMIBf8ZrWdISoO2vPDwL+x52TZnZBHBbUq8zwySQNLMfknocupPAzbLy8Czsu971TcD3wvWOmY35+yfX2krz8DzX4OwbXe/mYd9MpXl4Gh9rfNuWAjtyVh9gbc6/XcV4uAe4DrRIavNTIQMcBE5KGvTka/f6pyvKw2ZmQIsD+5h31GBmZ4Fm7+wbsAbYa2Z9EQ//r/YHCOoe6W9/vj4AAAAASUVORK5CYII=";
	}

	public destroy() : void {
		if (this.filter)
			this.filter.destroy();

		if (this.pointerHandler)
			this.pointerHandler.destroy();

		zeroObject(this);
	}

	private static formatDB(dB: number): string {
		if (dB < -40) return "-Inf.";
		return ((dB < 0) ? dB.toFixed(2) : ((dB === 0) ? "-" + dB.toFixed(2) : "+" + dB.toFixed(2)));
	}

	private static formatFrequency(frequencyAndEquivalent: number[]): string {
		return frequencyAndEquivalent[0] + " Hz (" + ((frequencyAndEquivalent[1] < 1000) ? (frequencyAndEquivalent[1] + " Hz") : ((frequencyAndEquivalent[1] / 1000) + " kHz")) + ")";
	}

	private static setFirstNodeText(element: HTMLElement, text: string): void {
		if (element.firstChild)
			element.firstChild.nodeValue = text;
	}

	private btnMnu_Click(e: MouseEvent): boolean {
		if (!e.button) {
			if (this.mnu.style.display === "none") {
				this.mnu.style.bottom = (this.element.clientHeight - 260) + "px";
				this.mnu.style.display = "inline-block";
				GraphicalFilterEditorControl.setFirstNodeText(this.btnMnu, "\u25BC");
			} else {
				this.mnu.style.display = "none";
				GraphicalFilterEditorControl.setFirstNodeText(this.btnMnu, "\u25B2");
			}
		}
		return true;
	}

	private checkMenu(mnu: HTMLDivElement, chk: boolean): boolean {
		(mnu.firstChild as HTMLElement).style.visibility = (chk ? "visible" : "hidden");
		return chk;
	}

	private mnuChB_Click(channelIndex: number, e: MouseEvent): boolean {
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
	}

	private mnuChLR_Click(channelIndex: number, e: MouseEvent): boolean {
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
	}

	private mnuShowZones_Click(e: MouseEvent): boolean {
		if (!e.button) {
			this.showZones = !this.showZones;
			this.checkMenu(this.mnuShowZones, this.showZones);
			this.drawCurve();
		}
		return true;
	}

	private mnuEditZones_Click(e: MouseEvent): boolean {
		if (!e.button) {
			this.editZones = !this.editZones;
			this.checkMenu(this.mnuEditZones, this.editZones);
		}
		return true;
	}

	private mnuNormalizeCurves_Click(e: MouseEvent): boolean {
		if (!e.button) {
			this.filter.changeIsNormalized(!this.filter.isNormalized, this.currentChannelIndex, this.isSameFilterLR);
			this.checkMenu(this.mnuNormalizeCurves, this.filter.isNormalized);
			if (this.isActualChannelCurveNeeded) {
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
				this.drawCurve();
			}
		}
		return true;
	}

	private mnuShowActual_Click(e: MouseEvent): boolean {
		if (!e.button) {
			this.isActualChannelCurveNeeded = !this.isActualChannelCurveNeeded;
			this.checkMenu(this.mnuShowActual, this.isActualChannelCurveNeeded);
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
		}
		return true;
	}

	private mouseDown(e: MouseEvent): boolean {
		if (!e.button && !this.drawingMode) {
			const rect = this.canvas.getBoundingClientRect(),
				x = (e.clientX - rect.left) | 0,
				y = (e.clientY - rect.top) | 0;

			if (x >= 0 && x < GraphicalFilterEditorControl.ControlWidth) {
				this.canvas.removeEventListener("mousemove", this.boundMouseMove);

				this.drawingMode = 1;

				if (this.editZones) {
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
				} else {
					this.filter.channelCurves[this.currentChannelIndex][x] = this.filter.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
				}

				this.drawCurve();

				return true;
			}
		}
		return false;
	}

	private mouseMove(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		let x = (e.clientX - rect.left) | 0,
			y = (e.clientY - rect.top) | 0;

		if (this.drawingMode || (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height)) {
			let curve = this.filter.channelCurves[this.currentChannelIndex];

			if (x < 0)
				x = 0;
			else if (x >= GraphicalFilterEditorControl.ControlWidth)
				x = GraphicalFilterEditorControl.ControlWidth - 1;

			if (this.drawingMode) {
				if (this.editZones) {
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
				} else {
					if (Math.abs(x - this.lastDrawX) > 1) {
						const delta = (y - this.lastDrawY) / Math.abs(x - this.lastDrawX),
							inc = ((x < this.lastDrawX) ? -1 : 1);
						let count = Math.abs(x - this.lastDrawX) - 1;
						y = this.lastDrawY + delta;
						for (x = this.lastDrawX + inc; count > 0; x += inc, count--) {
							curve[x] = this.filter.clampY(y);
							y += delta;
						}
					}
					curve[x] = this.filter.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
				}
				this.drawCurve();
			} else if (this.isActualChannelCurveNeeded) {
				curve = this.filter.actualChannelCurve;
			}

			GraphicalFilterEditorControl.setFirstNodeText(this.lblCursor, GraphicalFilterEditorControl.formatDB(this.filter.yToDB(y)));
			GraphicalFilterEditorControl.setFirstNodeText(this.lblCurve, GraphicalFilterEditorControl.formatDB(this.filter.yToDB(curve[x])));
			GraphicalFilterEditorControl.setFirstNodeText(this.lblFrequency, GraphicalFilterEditorControl.formatFrequency(this.filter.visibleBinToFrequency(x, true) as number[]));
		}
	}

	private mouseUp(e: MouseEvent): void {
		if (this.drawingMode) {
			this.canvas.addEventListener("mousemove", this.boundMouseMove);
			this.drawingMode = 0;
			this.filter.updateFilter(this.currentChannelIndex, this.isSameFilterLR, false);
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
		}
	}

	public changeFilterLength(newFilterLength: number): boolean {
		if (this.filter.changeFilterLength(newFilterLength, this.currentChannelIndex, this.isSameFilterLR)) {
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
			return true;
		}
		return false;
	}

	public changeSampleRate(newSampleRate: number): boolean {
		if (this.filter.changeSampleRate(newSampleRate, this.currentChannelIndex, this.isSameFilterLR)) {
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
			return true;
		}
		return false;
	}

	public changeAudioContext(newAudioContext: AudioContext): boolean {
		return this.filter.changeAudioContext(newAudioContext, this.currentChannelIndex, this.isSameFilterLR);
	}

	private drawCurve(): void {
		// All the 0.5's here are because of this explanation:
		// http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		// "Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		// over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		// results in two lines that get drawn on the canvas.

		const ctx = this.ctx

		if (!ctx)
			return;

		const canvas = this.canvas,
			widthMinus1 = GraphicalFilterEditorControl.ControlWidth - 1;
		let curve = this.filter.channelCurves[this.currentChannelIndex];

		ctx.fillStyle = "#303030";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#5a5a5a";
		ctx.beginPath();

		let x = canvas.width + 1.5,
			y = GraphicalFilterEditor.ZeroChannelValueY + 0.5;
		ctx.moveTo(x, y);
		while (x > 0) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();

		ctx.drawImage(this.labelImage, 0, 0, 44, 16, canvas.width - 44, GraphicalFilterEditor.ZeroChannelValueY - 16, 44, 16);

		ctx.beginPath();
		x = canvas.width - 1.5;
		y = GraphicalFilterEditor.ValidYRangeHeight + 0.5;
		ctx.moveTo(x, y);
		while (x > 0) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();

		ctx.drawImage(this.labelImage, 0, 16, 44, 16, canvas.width - 44, GraphicalFilterEditor.ValidYRangeHeight - 16, 44, 16);

		if (this.showZones) {
			for (let i = this.filter.equivalentZonesFrequencyCount.length - 2; i > 0; i--) {
				x = this.filter.equivalentZonesFrequencyCount[i] + 0.5;
				y = GraphicalFilterEditor.MaximumChannelValueY + 0.5;

				ctx.beginPath();
				ctx.moveTo(x, y);
				while (y < GraphicalFilterEditor.MinimumChannelValueY) {
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
		// Just to fill up the last pixel!
		ctx.lineTo(x + 1, curve[x] + 0.5);
		ctx.stroke();

		if (this.isActualChannelCurveNeeded && !this.drawingMode) {
			curve = this.filter.actualChannelCurve;
			ctx.strokeStyle = this.rangeImage;
			ctx.beginPath();
			ctx.moveTo(0.5, curve[0] + 0.5);
			for (x = 1; x < widthMinus1; x++)
				ctx.lineTo(x + 0.5, curve[x] + 0.5);
			// Just to fill up the last pixel!
			ctx.lineTo(x + 1, curve[x] + 0.5);
			ctx.stroke();
		}
	}
}
