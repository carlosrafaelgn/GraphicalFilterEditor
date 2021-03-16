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

interface GraphicalFilterEditorSettings {
	showZones?: boolean;
	editMode?: number;
	isActualChannelCurveNeeded?: boolean;
	currentChannelIndex?: number;
	isSameFilterLR?: boolean;
	isNormalized?: boolean;
	leftCurve?: string;
	rightCurve?: string;
}

interface GraphicalFilterEditorUISettings {
	checkFontFamily?: string;
	checkFontSize?: string;
	radioCharacter?: string;
	radioMargin?: string;
	checkCharacter?: string;
	checkMargin?: string;

	menuFontFamily?: string;
	menuFontSize?: string;
	menuWidth?: string;
	menuPadding?: string;
	openMenuCharacter?: string;
	closeMenuCharacter?: string;
}

class GraphicalFilterEditorControl {
	public static readonly ControlWidth = Math.max(512, GraphicalFilterEditor.VisibleBinCount);
	public static readonly ControlHeight = GraphicalFilterEditor.ValidYRangeHeight + 4;

	private static readonly EditModeRegular = 0;
	private static readonly EditModeZones = 1;
	private static readonly EditModeSmoothNarrow = 2;
	private static readonly EditModeSmoothWide = 3;
	private static readonly EditModeFirst = 0;
	private static readonly EditModeLast = 3;

	public readonly filter: GraphicalFilterEditor;
	public readonly element: HTMLDivElement;

	private readonly pointerHandler: PointerHandler;
	private readonly canvas: HTMLCanvasElement;
	private readonly canvasLeftMargin: number;
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
	private readonly mnuEditRegular: HTMLDivElement;
	private readonly mnuEditZones: HTMLDivElement;
	private readonly mnuEditSmoothNarrow: HTMLDivElement;
	private readonly mnuEditSmoothWide: HTMLDivElement;
	private readonly mnuNormalizeCurves: HTMLDivElement;
	private readonly mnuShowActual: HTMLDivElement;
	private readonly lblCursor: HTMLSpanElement;
	private readonly lblCurve: HTMLSpanElement;
	private readonly lblFrequency: HTMLSpanElement;

	private readonly openMenuCharacter: string;
	private readonly closeMenuCharacter: string;

	private showZones = false;
	private editMode = GraphicalFilterEditorControl.EditModeRegular;
	private isActualChannelCurveNeeded = true;
	private currentChannelIndex = 0;
	private isSameFilterLR = true;
	private drawingMode = 0;
	private lastDrawX = 0;
	private lastDrawY = 0;
	private drawOffsetX = 0;
	private drawOffsetY = 0;

	private boundMouseMove: any;

	public constructor(element: HTMLDivElement, filterLength: number, audioContext: AudioContext, convolverCallback: ConvolverCallback, settings?: GraphicalFilterEditorSettings | null, uiSettings?: GraphicalFilterEditorUISettings | null) {
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
					let checkCharacter = (radio ? "\u25CF " : "\u25A0 "),
						margin: string | null = null;
					if (uiSettings) {
						let checkCharacterOK = false;
						if (radio) {
							if (uiSettings.radioCharacter) {
								checkCharacterOK = true;
								checkCharacter = uiSettings.radioCharacter;
								margin = (uiSettings.radioMargin || "2px");
							}
						} else if (uiSettings.checkCharacter) {
							checkCharacterOK = true;
							checkCharacter = uiSettings.checkCharacter;
							margin = (uiSettings.checkMargin || "2px");
						}
						if (checkCharacterOK) {
							if (uiSettings.checkFontFamily)
								s.style.fontFamily = uiSettings.checkFontFamily;
							if (uiSettings.checkFontSize)
								s.style.fontSize = uiSettings.checkFontSize;
						}
					}
					if (margin)
						s.style.marginRight = margin;
					s.appendChild(document.createTextNode(checkCharacter));
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

		this.canvasLeftMargin = Math.abs(GraphicalFilterEditorControl.ControlWidth - GraphicalFilterEditor.VisibleBinCount) >> 1;

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
		this.openMenuCharacter = "\u25B2";
		this.closeMenuCharacter = "\u25BC";
		if (uiSettings) {
			let menuCharacterOK = false;
			if (uiSettings.openMenuCharacter) {
				menuCharacterOK = true;
				this.openMenuCharacter = uiSettings.openMenuCharacter;
				this.closeMenuCharacter = (uiSettings.closeMenuCharacter || this.openMenuCharacter);
			} else if (uiSettings.closeMenuCharacter) {
				menuCharacterOK = true;
				this.openMenuCharacter = uiSettings.closeMenuCharacter;
				this.closeMenuCharacter = this.openMenuCharacter;
			}
			if (menuCharacterOK) {
				if (uiSettings.menuFontFamily)
					this.btnMnu.style.fontFamily = uiSettings.menuFontFamily;
				if (uiSettings.menuFontSize)
					this.btnMnu.style.fontSize = uiSettings.menuFontSize;
				if (uiSettings.menuWidth)
					this.btnMnu.style.width = uiSettings.menuWidth;
				if (uiSettings.menuPadding)
					this.btnMnu.style.padding = uiSettings.menuPadding;
			}
		}
		this.btnMnu.appendChild(document.createTextNode(this.openMenuCharacter));
		this.btnMnu.onclick = this.btnMnu_Click.bind(this);
		element.appendChild(this.btnMnu);

		this.mnu = document.createElement("div");
		this.mnu.className = "GEMNU";
		this.mnu.style.display = "none";

		let mnuh = document.createElement("div");
		mnuh.className = "GEMNUH";
		mnuh.appendChild(createMenuLabel("Same curve for both channels"));
		mnuh.appendChild(this.mnuChBL = createMenuItem("Use left curve", true, true, true, this.mnuChB_Click.bind(this, 0)));
		mnuh.appendChild(this.mnuChBR = createMenuItem("Use right curve", true, false, true, this.mnuChB_Click.bind(this, 1)));
		mnuh.appendChild(createMenuSep());
		mnuh.appendChild(createMenuLabel("One curve for each channel"));
		mnuh.appendChild(this.mnuChL = createMenuItem("Show left curve", true, false, true, this.mnuChLR_Click.bind(this, 0)));
		mnuh.appendChild(this.mnuChR = createMenuItem("Show right curve", true, false, true, this.mnuChLR_Click.bind(this, 1)));
		this.mnu.appendChild(mnuh);

		mnuh = document.createElement("div");
		mnuh.className = "GEMNUH GEMNUSEPH";
		mnuh.appendChild(createMenuItem("Reset curve", false, false, false, this.mnuResetCurve_Click.bind(this)));
		mnuh.appendChild(createMenuSep());
		mnuh.appendChild(createMenuLabel("Edit mode"));
		mnuh.appendChild(this.mnuEditRegular = createMenuItem("Regular", true, true, true, this.mnuEditRegular_Click.bind(this)));
		mnuh.appendChild(this.mnuEditZones = createMenuItem("Zones", true, false, true, this.mnuEditZones_Click.bind(this)));
		mnuh.appendChild(this.mnuEditSmoothNarrow = createMenuItem("Smooth (narrow)", true, false, true, this.mnuEditSmoothNarrow_Click.bind(this)));
		mnuh.appendChild(this.mnuEditSmoothWide = createMenuItem("Smooth (wide)", true, false, true, this.mnuEditSmoothWide_Click.bind(this)));
		mnuh.appendChild(createMenuSep());
		mnuh.appendChild(this.mnuNormalizeCurves = createMenuItem("Normalize curves", true, false, false, this.mnuNormalizeCurves_Click.bind(this)));
		mnuh.appendChild(this.mnuShowZones = createMenuItem("Show zones", true, false, false, this.mnuShowZones_Click.bind(this)));
		mnuh.appendChild(this.mnuShowActual = createMenuItem("Show actual response", true, true, false, this.mnuShowActual_Click.bind(this)));
		this.mnu.appendChild(mnuh);

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

		if (settings)
			this.loadSettings(settings);
	}

	public destroy() : void {
		if (this.filter)
			this.filter.destroy();

		if (this.pointerHandler)
			this.pointerHandler.destroy();

		zeroObject(this);
	}

	public loadSettings(settings?: GraphicalFilterEditorSettings | null): void {
		if (!settings)
			return;

		const filter = this.filter;

		if (settings.showZones === false || settings.showZones === true)
			this.showZones = settings.showZones;

		if (settings.editMode && settings.editMode >= GraphicalFilterEditorControl.EditModeFirst && settings.editMode <= GraphicalFilterEditorControl.EditModeLast)
			this.editMode = settings.editMode;

		if (settings.isActualChannelCurveNeeded === false || settings.isActualChannelCurveNeeded === true)
			this.isActualChannelCurveNeeded = settings.isActualChannelCurveNeeded;

		if (settings.currentChannelIndex === 0 || settings.currentChannelIndex === 1)
			this.currentChannelIndex = settings.currentChannelIndex;

		if (settings.isSameFilterLR === false || settings.isSameFilterLR === true)
			this.isSameFilterLR = settings.isSameFilterLR;

		let leftCurve = GraphicalFilterEditor.decodeCurve(settings.leftCurve),
			rightCurve = GraphicalFilterEditor.decodeCurve(settings.rightCurve);

		if (leftCurve && !rightCurve)
			rightCurve = leftCurve;
		else if (rightCurve && !leftCurve)
			leftCurve = rightCurve;

		if (leftCurve) {
			const curve = filter.channelCurves[0];
			for (let i = GraphicalFilterEditor.VisibleBinCount - 1; i >= 0; i--)
				curve[i] = filter.clampY(leftCurve[i]);
		}

		if (rightCurve) {
			const curve = filter.channelCurves[1];
			for (let i = GraphicalFilterEditor.VisibleBinCount - 1; i >= 0; i--)
				curve[i] = filter.clampY(rightCurve[i]);
		}

		if (this.isSameFilterLR) {
			this.checkMenu(this.mnuChBL, (this.currentChannelIndex === 0));
			this.checkMenu(this.mnuChL, false);
			this.checkMenu(this.mnuChBR, (this.currentChannelIndex === 1));
			this.checkMenu(this.mnuChR, false);
		} else {
			this.checkMenu(this.mnuChBL, false);
			this.checkMenu(this.mnuChL, (this.currentChannelIndex === 0));
			this.checkMenu(this.mnuChBR, false);
			this.checkMenu(this.mnuChR, (this.currentChannelIndex === 1));
		}

		const isNormalized = ((settings.isNormalized === false || settings.isNormalized === true) ? settings.isNormalized : filter.isNormalized);

		if (isNormalized === filter.isNormalized)
			filter.updateFilter(this.currentChannelIndex, this.isSameFilterLR, true);
		else
			filter.changeIsNormalized(isNormalized, this.currentChannelIndex, this.isSameFilterLR);

		if (this.isActualChannelCurveNeeded)
			this.filter.updateActualChannelCurve(this.currentChannelIndex);

		this.checkMenu(this.mnuShowZones, this.showZones);
		this.changeEditMode(this.editMode);
		this.checkMenu(this.mnuNormalizeCurves, this.filter.isNormalized);
		this.checkMenu(this.mnuShowActual, this.isActualChannelCurveNeeded);

		this.drawCurve();
	}

	public saveSettings(): GraphicalFilterEditorSettings {
		return {
			showZones: this.showZones,
			editMode: this.editMode,
			isActualChannelCurveNeeded: this.isActualChannelCurveNeeded,
			currentChannelIndex: this.currentChannelIndex,
			isSameFilterLR: this.isSameFilterLR,
			isNormalized: this.filter.isNormalized,
			leftCurve: GraphicalFilterEditor.encodeCurve(this.filter.channelCurves[0]),
			rightCurve: GraphicalFilterEditor.encodeCurve(this.filter.channelCurves[1])
		};
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
				this.mnu.style.bottom = (this.element.clientHeight - GraphicalFilterEditorControl.ControlHeight) + "px";
				this.mnu.style.display = "inline-block";
				GraphicalFilterEditorControl.setFirstNodeText(this.btnMnu, this.closeMenuCharacter);
			} else {
				this.mnu.style.display = "none";
				GraphicalFilterEditorControl.setFirstNodeText(this.btnMnu, this.openMenuCharacter);
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
		return this.btnMnu_Click(e);
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
		return this.btnMnu_Click(e);
	}

	private mnuResetCurve_Click(e: MouseEvent): boolean {
		if (!e.button) {
			const curve = this.filter.channelCurves[this.currentChannelIndex];
			for (let i = curve.length - 1; i >= 0; i--)
				curve[i] = GraphicalFilterEditor.ZeroChannelValueY;

			this.filter.updateFilter(this.currentChannelIndex, this.isSameFilterLR, false);
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
		}
		return this.btnMnu_Click(e);
	}

	private mnuShowZones_Click(e: MouseEvent): boolean {
		if (!e.button) {
			this.showZones = !this.showZones;
			this.checkMenu(this.mnuShowZones, this.showZones);
			this.drawCurve();
		}
		return this.btnMnu_Click(e);
	}

	private changeEditMode(editMode: number): void {
		if (editMode < GraphicalFilterEditorControl.EditModeFirst || editMode > GraphicalFilterEditorControl.EditModeLast)
			return;
		this.editMode = editMode;
		this.checkMenu(this.mnuEditRegular, editMode === GraphicalFilterEditorControl.EditModeRegular);
		this.checkMenu(this.mnuEditZones, editMode === GraphicalFilterEditorControl.EditModeZones);
		this.checkMenu(this.mnuEditSmoothNarrow, editMode === GraphicalFilterEditorControl.EditModeSmoothNarrow);
		this.checkMenu(this.mnuEditSmoothWide, editMode === GraphicalFilterEditorControl.EditModeSmoothWide);
	}

	private mnuEditRegular_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.EditModeRegular);
		return this.btnMnu_Click(e);
	}

	private mnuEditZones_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.EditModeZones);
		return this.btnMnu_Click(e);
	}

	private mnuEditSmoothNarrow_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.EditModeSmoothNarrow);
		return this.btnMnu_Click(e);
	}

	private mnuEditSmoothWide_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.EditModeSmoothWide);
		return this.btnMnu_Click(e);
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
		return this.btnMnu_Click(e);
	}

	private mnuShowActual_Click(e: MouseEvent): boolean {
		if (!e.button) {
			this.isActualChannelCurveNeeded = !this.isActualChannelCurveNeeded;
			this.checkMenu(this.mnuShowActual, this.isActualChannelCurveNeeded);
			if (this.isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
			this.drawCurve();
		}
		return this.btnMnu_Click(e);
	}

	private mouseDown(e: MouseEvent): boolean {
		if (!e.button && !this.drawingMode) {
			const rect = this.canvas.getBoundingClientRect(),
				x = (e.clientX - rect.left - this.canvasLeftMargin) | 0,
				y = (e.clientY - rect.top) | 0;

			this.canvas.removeEventListener("mousemove", this.boundMouseMove);

			this.drawingMode = 1;

			switch (this.editMode) {
				case GraphicalFilterEditorControl.EditModeZones:
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.EditModeSmoothNarrow:
					this.filter.startSmoothEdition(this.currentChannelIndex);
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.VisibleBinCount >> 3);
					break;
				case GraphicalFilterEditorControl.EditModeSmoothWide:
					this.filter.startSmoothEdition(this.currentChannelIndex);
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.VisibleBinCount >> 1);
					break;
				default:
					this.filter.channelCurves[this.currentChannelIndex][this.filter.clampX(x)] = this.filter.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
					break;
			}

			this.drawCurve();

			return true;
		}
		return false;
	}

	private mouseMove(e: MouseEvent): void {
		const rect = this.canvas.getBoundingClientRect();
		let x = (e.clientX - rect.left - this.canvasLeftMargin) | 0,
			y = (e.clientY - rect.top) | 0;

		let curve = this.filter.channelCurves[this.currentChannelIndex];

		if (this.drawingMode) {
			switch (this.editMode) {
				case GraphicalFilterEditorControl.EditModeZones:
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.EditModeSmoothNarrow:
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.VisibleBinCount >> 3);
					break;
				case GraphicalFilterEditorControl.EditModeSmoothWide:
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.VisibleBinCount >> 1);
					break;
				default:
					if (Math.abs(x - this.lastDrawX) > 1) {
						const delta = (y - this.lastDrawY) / Math.abs(x - this.lastDrawX),
							inc = ((x < this.lastDrawX) ? -1 : 1);
						let count = Math.abs(x - this.lastDrawX) - 1;
						y = this.lastDrawY + delta;
						for (x = this.lastDrawX + inc; count > 0; x += inc, count--) {
							curve[this.filter.clampX(x)] = this.filter.clampY(y);
							y += delta;
						}
					}
					curve[this.filter.clampX(x)] = this.filter.clampY(y);
					this.lastDrawX = x;
					this.lastDrawY = y;
					break;
			}
			this.drawCurve();
		} else if (this.isActualChannelCurveNeeded) {
			curve = this.filter.actualChannelCurve;
		}

		x = this.filter.clampX(x);
		GraphicalFilterEditorControl.setFirstNodeText(this.lblCursor, GraphicalFilterEditorControl.formatDB(this.filter.yToDB(y)));
		GraphicalFilterEditorControl.setFirstNodeText(this.lblCurve, GraphicalFilterEditorControl.formatDB(this.filter.yToDB(curve[x])));
		GraphicalFilterEditorControl.setFirstNodeText(this.lblFrequency, GraphicalFilterEditorControl.formatFrequency(this.filter.visibleBinToFrequency(x, true) as number[]));
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
			canvasLeftMargin = this.canvasLeftMargin,
			widthPlusMarginMinus1 = canvasLeftMargin + GraphicalFilterEditor.VisibleBinCount - 1,
			dashCount = Math.round((widthPlusMarginMinus1 - canvasLeftMargin + 1) / 10);
		let curve = this.filter.channelCurves[this.currentChannelIndex];

		ctx.fillStyle = "#303030";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		ctx.strokeStyle = "#5a5a5a";
		ctx.beginPath();

		let x = widthPlusMarginMinus1 + 1,
			y = GraphicalFilterEditor.ZeroChannelValueY + 0.5;
		ctx.moveTo(x, y);
		for (let i = dashCount - 1; i >= 0; i--) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();

		ctx.drawImage(this.labelImage, 0, 0, 44, 16, widthPlusMarginMinus1 - 42, GraphicalFilterEditor.ZeroChannelValueY - 16, 44, 16);

		ctx.beginPath();
		x = widthPlusMarginMinus1 + 1;
		y = GraphicalFilterEditor.ValidYRangeHeight + 0.5;
		ctx.moveTo(x, y);
		for (let i = dashCount - 1; i >= 0; i--) {
			ctx.lineTo(x - 4, y);
			x -= 10;
			ctx.moveTo(x, y);
		}
		ctx.stroke();

		ctx.drawImage(this.labelImage, 0, 16, 44, 16, widthPlusMarginMinus1 - 42, GraphicalFilterEditor.ValidYRangeHeight - 16, 44, 16);

		if (this.showZones) {
			for (let i = this.filter.equivalentZonesFrequencyCount.length - 2; i > 0; i--) {
				x = this.filter.equivalentZonesFrequencyCount[i] + canvasLeftMargin + 0.5;
				y = GraphicalFilterEditor.MaximumChannelValueY;

				ctx.beginPath();
				ctx.moveTo(x, y);
				while (y <= GraphicalFilterEditor.MinimumChannelValueY) {
					ctx.lineTo(x, y + 4);
					y += 10;
					ctx.moveTo(x, y);
				}
				ctx.stroke();
			}
		}

		const visibleBinCountMinus1 = GraphicalFilterEditor.VisibleBinCount - 1;

		ctx.strokeStyle = ((this.isActualChannelCurveNeeded && !this.drawingMode) ? "#707070" : this.rangeImage);
		ctx.beginPath();
		ctx.moveTo(canvasLeftMargin, curve[0] + 0.5);
		for (x = 1; x < visibleBinCountMinus1; x++)
			ctx.lineTo(canvasLeftMargin + x, curve[x] + 0.5);
		// Just to fill up the last pixel!
		ctx.lineTo(canvasLeftMargin + x + 1, curve[x] + 0.5);
		ctx.stroke();

		if (this.isActualChannelCurveNeeded && !this.drawingMode) {
			curve = this.filter.actualChannelCurve;
			ctx.strokeStyle = this.rangeImage;
			ctx.beginPath();
			ctx.moveTo(canvasLeftMargin, curve[0] + 0.5);
			for (x = 1; x < visibleBinCountMinus1; x++)
				ctx.lineTo(canvasLeftMargin + x, curve[x] + 0.5);
			// Just to fill up the last pixel!
			ctx.lineTo(canvasLeftMargin + x + 1, curve[x] + 0.5);
			ctx.stroke();
		}
	}
}
