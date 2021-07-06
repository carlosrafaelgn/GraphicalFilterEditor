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
	svgRenderer?: boolean;
	scale?: number;
	hideEditModePeakingEq?: boolean;
	hideEditModeShelfEq?: boolean;

	checkFontFamily?: string;
	checkFontSize?: string;
	radioHTML?: string;
	radioCharacter?: string;
	radioMargin?: string;
	checkHTML?: string;
	checkCharacter?: string;
	checkMargin?: string;

	menuFontFamily?: string;
	menuFontSize?: string;
	menuWidth?: string;
	menuPadding?: string;
	openMenuHTML?: string;
	openMenuCharacter?: string;
	closeMenuHTML?: string;
	closeMenuCharacter?: string;
}

class GraphicalFilterEditorControl {
	public static readonly controlWidth = Math.max(512, GraphicalFilterEditor.visibleBinCount);
	public static readonly controlHeight = GraphicalFilterEditor.validYRangeHeight + 3;

	public static readonly editModeRegular = 0;
	public static readonly editModeZones = 1;
	public static readonly editModeSmoothNarrow = 2;
	public static readonly editModeSmoothWide = 3;
	public static readonly editModePeakingEq = 4;
	public static readonly editModeShelfEq = 5;
	public static readonly editModeFirst = 0;
	public static readonly editModeLast = 5;

	public readonly filter: GraphicalFilterEditor;
	public readonly element: HTMLDivElement;

	private readonly pointerHandler: PointerHandler;
	private readonly renderer: GraphicalFilterEditorRenderer<HTMLElement>;
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
	private readonly mnuEditPeakingEq: HTMLDivElement;
	private readonly mnuEditShelfEq: HTMLDivElement;
	private readonly mnuNormalizeCurves: HTMLDivElement;
	private readonly mnuShowActual: HTMLDivElement;
	private readonly lblCursor: HTMLSpanElement;
	private readonly lblCurve: HTMLSpanElement;
	private readonly lblFrequency: HTMLSpanElement;

	private readonly openMenuElement: HTMLElement | null;
	private readonly openMenuCharacter: string;
	private readonly closeMenuElement: HTMLElement | null;
	private readonly closeMenuCharacter: string;

	private showZones = false;
	private editMode = GraphicalFilterEditorControl.editModeRegular;
	private isActualChannelCurveNeeded = true;
	private currentChannelIndex = 0;
	private isSameFilterLR = true;
	private drawingMode = 0;
	private lastDrawX = 0;
	private lastDrawY = 0;
	private drawOffsetX = 0;
	private drawOffsetY = 0;
	private _scale: number;

	private boundMouseMove: any;

	public constructor(element: HTMLDivElement, filterLength: number, audioContext: AudioContext, filterChangedCallback: FilterChangedCallback, settings?: GraphicalFilterEditorSettings | null, uiSettings?: GraphicalFilterEditorUISettings | null) {
		if (filterLength < 8 || (filterLength & (filterLength - 1)))
			throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";

		this.filter = new GraphicalFilterEditor(filterLength, audioContext, filterChangedCallback);

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
			createMenuItem = (text: string, checkable: boolean, checked: boolean, radio: boolean, clickHandler: (ev: MouseEvent) => any, className?: string | null) => {
				const i = document.createElement("div");
				i.className = (className ? ("GEMNUIT GECLK " + className) : "GEMNUIT GECLK");
				if (checkable) {
					if (uiSettings && ((radio && uiSettings.radioHTML) || (!radio && uiSettings.checkHTML))) {
						i.innerHTML = (radio ? uiSettings.radioHTML : uiSettings.checkHTML) as string;
						const s = i.firstChild as HTMLElement;
						if (radio)
							s.style.marginRight = (uiSettings.radioMargin || "2px");
						else
							s.style.marginRight = (uiSettings.checkMargin || "2px");
						if (!checked)
							s.style.visibility = "hidden";
					} else {
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
				}
				i.appendChild(document.createTextNode(text));
				if (clickHandler)
					i.onclick = clickHandler;
				return i;
			};

		this.element = element;
		element.className = "GE";

		this.boundMouseMove = this.mouseMove.bind(this);

		this._scale = 0;
		this.scale = ((uiSettings && uiSettings.scale && uiSettings.scale > 0) ? uiSettings.scale : 1);

		this.renderer = ((uiSettings && uiSettings.svgRenderer) ? new GraphicalFilterEditorSVGRenderer(this) : new GraphicalFilterEditorCanvasRenderer(this));
		this.renderer.element.addEventListener("mousemove", this.boundMouseMove);
		this.renderer.element.oncontextmenu = cancelEvent;
		element.appendChild(this.renderer.element);

		this.pointerHandler = new PointerHandler(this.renderer.element, this.mouseDown.bind(this), this.mouseMove.bind(this), this.mouseUp.bind(this));

		element.oncontextmenu = cancelEvent;

		let lbl = document.createElement("div");
		lbl.className = "GELBL";
		lbl.style.width = "9em";
		lbl.appendChild(document.createTextNode(GraphicalFilterEditorStrings.Cursor));
		lbl.appendChild(this.lblCursor = document.createElement("span"));
		lbl.appendChild(document.createTextNode(" dB"));
		this.lblCursor.appendChild(document.createTextNode(GraphicalFilterEditorStrings.Minus0));
		element.appendChild(lbl);

		lbl = document.createElement("div");
		lbl.className = "GELBL";
		lbl.style.width = "9em";
		lbl.appendChild(document.createTextNode(GraphicalFilterEditorStrings.Curve));
		lbl.appendChild(this.lblCurve = document.createElement("span"));
		lbl.appendChild(document.createTextNode(" dB"));
		this.lblCurve.appendChild(document.createTextNode(GraphicalFilterEditorStrings.Minus0));
		element.appendChild(lbl);

		lbl = document.createElement("div");
		lbl.className = "GELBL";
		lbl.appendChild(document.createTextNode(GraphicalFilterEditorStrings.Frequency));
		lbl.appendChild(this.lblFrequency = document.createElement("span"));
		this.lblFrequency.appendChild(document.createTextNode("0 Hz (31 Hz)"));
		element.appendChild(lbl);

		this.btnMnu = document.createElement("div");
		this.btnMnu.className = "GEBTN GECLK";
		this.openMenuElement = null;
		this.openMenuCharacter = "\u25B2";
		this.closeMenuElement = null;
		this.closeMenuCharacter = "\u25BC";
		if (uiSettings) {
			let menuCharacterOK = false;
			if (uiSettings.openMenuHTML && uiSettings.closeMenuHTML) {
				menuCharacterOK = true;
				this.btnMnu.innerHTML = uiSettings.openMenuHTML + uiSettings.closeMenuHTML;
				this.openMenuElement = this.btnMnu.childNodes[0] as HTMLElement;
				this.closeMenuElement = this.btnMnu.childNodes[1] as HTMLElement;
				this.closeMenuElement.style.display = "none";
			} else if (uiSettings.openMenuCharacter) {
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
		if (!this.openMenuElement)
			this.btnMnu.appendChild(document.createTextNode(this.openMenuCharacter));
		this.btnMnu.onclick = this.btnMnu_Click.bind(this);
		element.appendChild(this.btnMnu);

		this.mnu = document.createElement("div");
		this.mnu.className = "GEMNU";
		this.mnu.style.display = "none";

		let mnuh = document.createElement("div");
		mnuh.className = "GEMNUH GEFILTER";
		mnuh.appendChild(createMenuLabel(GraphicalFilterEditorStrings.SameCurve));
		mnuh.appendChild(this.mnuChBL = createMenuItem(GraphicalFilterEditorStrings.UseLeftCurve, true, true, true, this.mnuChB_Click.bind(this, 0)));
		mnuh.appendChild(this.mnuChBR = createMenuItem(GraphicalFilterEditorStrings.UseRightCurve, true, false, true, this.mnuChB_Click.bind(this, 1)));
		mnuh.appendChild(createMenuSep());
		mnuh.appendChild(createMenuLabel(GraphicalFilterEditorStrings.OneForEach));
		mnuh.appendChild(this.mnuChL = createMenuItem(GraphicalFilterEditorStrings.ShowLeftCurve, true, false, true, this.mnuChLR_Click.bind(this, 0)));
		mnuh.appendChild(this.mnuChR = createMenuItem(GraphicalFilterEditorStrings.ShowRightCurve, true, false, true, this.mnuChLR_Click.bind(this, 1)));
		this.mnu.appendChild(mnuh);

		mnuh = document.createElement("div");
		mnuh.className = "GEMNUH GEMNUSEPH";
		mnuh.appendChild(createMenuItem(GraphicalFilterEditorStrings.ResetCurve, false, false, false, this.mnuResetCurve_Click.bind(this)));
		mnuh.appendChild(createMenuSep());
		mnuh.appendChild(createMenuLabel(GraphicalFilterEditorStrings.EditMode));
		mnuh.appendChild(this.mnuEditRegular = createMenuItem(GraphicalFilterEditorStrings.Regular, true, true, true, this.mnuEditRegular_Click.bind(this)));
		mnuh.appendChild(this.mnuEditZones = createMenuItem(GraphicalFilterEditorStrings.Zones, true, false, true, this.mnuEditZones_Click.bind(this)));
		mnuh.appendChild(this.mnuEditSmoothNarrow = createMenuItem(GraphicalFilterEditorStrings.SmoothNarrow, true, false, true, this.mnuEditSmoothNarrow_Click.bind(this)));
		mnuh.appendChild(this.mnuEditSmoothWide = createMenuItem(GraphicalFilterEditorStrings.SmoothWide, true, false, true, this.mnuEditSmoothWide_Click.bind(this)));
		mnuh.appendChild(this.mnuEditPeakingEq = createMenuItem(GraphicalFilterEditorStrings.PeakingEq, true, false, true, this.mnuEditPeakingEq_Click.bind(this)));
		if (uiSettings && uiSettings.hideEditModePeakingEq)
			this.mnuEditPeakingEq.style.display = "none";
		mnuh.appendChild(this.mnuEditShelfEq = createMenuItem(GraphicalFilterEditorStrings.ShelfEq, true, false, true, this.mnuEditShelfEq_Click.bind(this)));
		if (uiSettings && uiSettings.hideEditModeShelfEq)
			this.mnuEditShelfEq.style.display = "none";
		mnuh.appendChild(createMenuSep());
		mnuh.appendChild(this.mnuNormalizeCurves = createMenuItem(GraphicalFilterEditorStrings.NormalizeCurves, true, false, false, this.mnuNormalizeCurves_Click.bind(this), "GEFILTER"));
		mnuh.appendChild(this.mnuShowZones = createMenuItem(GraphicalFilterEditorStrings.ShowZones, true, false, false, this.mnuShowZones_Click.bind(this)));
		mnuh.appendChild(this.mnuShowActual = createMenuItem(GraphicalFilterEditorStrings.ShowActualResponse, true, true, false, this.mnuShowActual_Click.bind(this)));
		this.mnu.appendChild(mnuh);

		element.appendChild(this.mnu);

		if (settings)
			this.loadSettings(settings);

		this.drawCurve();
	}

	public destroy() : void {
		if (this.filter)
			this.filter.destroy();

		if (this.pointerHandler)
			this.pointerHandler.destroy();

		if (this.renderer)
			this.renderer.destroy();

		zeroObject(this);
	}

	public loadSettings(settings?: GraphicalFilterEditorSettings | null): void {
		if (!settings)
			return;

		const filter = this.filter;

		if (settings.showZones === false || settings.showZones === true)
			this.showZones = settings.showZones;

		if (settings.editMode && settings.editMode >= GraphicalFilterEditorControl.editModeFirst && settings.editMode <= GraphicalFilterEditorControl.editModeLast)
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
			for (let i = GraphicalFilterEditor.visibleBinCount - 1; i >= 0; i--)
				curve[i] = filter.clampY(leftCurve[i]);
		}

		if (rightCurve) {
			const curve = filter.channelCurves[1];
			for (let i = GraphicalFilterEditor.visibleBinCount - 1; i >= 0; i--)
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

	public get scale(): number {
		return this._scale;
	}

	public set scale(scale: number) {
		if (scale <= 0 || this._scale === scale || !this.element)
			return;

		this._scale = scale;
		this.element.style.fontSize = (12 * scale) + "px";
		this.element.style.lineHeight = (16 * scale) + "px";

		if (this.renderer) {
			this.renderer.scaleChanged();
			this.drawCurve();
		}
	}

	private static formatDB(dB: number): string {
		if (dB < -40) return GraphicalFilterEditorStrings.MinusInfinity;
		return ((dB < 0) ? GraphicalFilterEditorStrings.toFixed(dB, 2) : ((dB === 0) ? GraphicalFilterEditorStrings.Minus0 : "+" + GraphicalFilterEditorStrings.toFixed(dB, 2)));
	}

	private static formatFrequency(frequencyAndEquivalent: number[]): string {
		return frequencyAndEquivalent[0].toFixed(0) + " Hz (" + ((frequencyAndEquivalent[1] < 1000) ? (frequencyAndEquivalent[1] + " Hz") : ((frequencyAndEquivalent[1] / 1000) + " kHz")) + ")";
	}

	private static setFirstNodeText(element: HTMLElement, text: string): void {
		if (element.firstChild)
			element.firstChild.nodeValue = text;
	}

	private btnMnu_Click(e: MouseEvent): boolean {
		if (!e.button) {
			if (this.mnu.style.display === "none") {
				this.mnu.style.bottom = (this.element.clientHeight - this.renderer.element.clientHeight) + "px";
				this.mnu.style.display = "inline-block";
				if (this.openMenuElement && this.closeMenuElement) {
					this.openMenuElement.style.display = "none";
					this.closeMenuElement.style.display = "";
				} else {
					GraphicalFilterEditorControl.setFirstNodeText(this.btnMnu, this.closeMenuCharacter);
				}
			} else {
				this.mnu.style.display = "none";
				if (this.openMenuElement && this.closeMenuElement) {
					this.closeMenuElement.style.display = "none";
					this.openMenuElement.style.display = "";
				} else {
					GraphicalFilterEditorControl.setFirstNodeText(this.btnMnu, this.openMenuCharacter);
				}
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
				curve[i] = GraphicalFilterEditor.zeroChannelValueY;

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
		if (editMode < GraphicalFilterEditorControl.editModeFirst || editMode > GraphicalFilterEditorControl.editModeLast)
			return;

		this.editMode = editMode;
		this.checkMenu(this.mnuEditRegular, editMode === GraphicalFilterEditorControl.editModeRegular);
		this.checkMenu(this.mnuEditZones, editMode === GraphicalFilterEditorControl.editModeZones);
		this.checkMenu(this.mnuEditSmoothNarrow, editMode === GraphicalFilterEditorControl.editModeSmoothNarrow);
		this.checkMenu(this.mnuEditSmoothWide, editMode === GraphicalFilterEditorControl.editModeSmoothWide);
		this.checkMenu(this.mnuEditPeakingEq, editMode === GraphicalFilterEditorControl.editModePeakingEq);
		this.checkMenu(this.mnuEditShelfEq, editMode === GraphicalFilterEditorControl.editModeShelfEq);

		let iirType = GraphicalFilterEditorIIRType.None;
		switch (editMode) {
			case GraphicalFilterEditorControl.editModePeakingEq:
				iirType = GraphicalFilterEditorIIRType.Peaking;
				break;
			case GraphicalFilterEditorControl.editModeShelfEq:
				iirType = GraphicalFilterEditorIIRType.Shelf;
				break;
		}

		if (this.filter.iirType !== iirType) {
			this.mnu.className = (iirType ? "GEMNU GEEQ" : "GEMNU");

			this.filter.changeIIRType(iirType, this.currentChannelIndex, this.isSameFilterLR);
			if (this.isActualChannelCurveNeeded) {
				this.filter.updateActualChannelCurve(this.currentChannelIndex);
				this.drawCurve();
			}
		}
	}

	private mnuEditRegular_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.editModeRegular);
		return this.btnMnu_Click(e);
	}

	private mnuEditZones_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.editModeZones);
		return this.btnMnu_Click(e);
	}

	private mnuEditSmoothNarrow_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.editModeSmoothNarrow);
		return this.btnMnu_Click(e);
	}

	private mnuEditSmoothWide_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.editModeSmoothWide);
		return this.btnMnu_Click(e);
	}

	private mnuEditPeakingEq_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.editModePeakingEq);
		return this.btnMnu_Click(e);
	}

	private mnuEditShelfEq_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.changeEditMode(GraphicalFilterEditorControl.editModeShelfEq);
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
			const rect = this.renderer.element.getBoundingClientRect(),
				x = (((e.clientX - rect.left) / this._scale) | 0) - this.renderer.leftMargin,
				y = (((e.clientY - rect.top) / this._scale) | 0);

			this.renderer.element.removeEventListener("mousemove", this.boundMouseMove);

			this.drawingMode = 1;

			switch (this.editMode) {
				case GraphicalFilterEditorControl.editModeZones:
				case GraphicalFilterEditorControl.editModePeakingEq:
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.editModeShelfEq:
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
					switch (this.filter.visibleBinToZoneIndex(x)) {
						case 0:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 1, y);
							break;
						case 1:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 0, y);
							break;
						case 4:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 5, y);
							break;
						case 5:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 4, y);
							break;
						case 6:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 7, y);
							break;
						case 7:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 6, y);
							break;
					}
					break;
				case GraphicalFilterEditorControl.editModeSmoothNarrow:
					this.filter.startSmoothEdition(this.currentChannelIndex);
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 3);
					break;
				case GraphicalFilterEditorControl.editModeSmoothWide:
					this.filter.startSmoothEdition(this.currentChannelIndex);
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 1);
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
		const rect = this.renderer.element.getBoundingClientRect();
		let x = (((e.clientX - rect.left) / this._scale) | 0) - this.renderer.leftMargin,
			y = (((e.clientY - rect.top) / this._scale) | 0);

		let curve = this.filter.channelCurves[this.currentChannelIndex];

		if (this.drawingMode) {
			switch (this.editMode) {
				case GraphicalFilterEditorControl.editModeZones:
				case GraphicalFilterEditorControl.editModePeakingEq:
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.editModeShelfEq:
					this.filter.changeZoneY(this.currentChannelIndex, x, y);
					switch (this.filter.visibleBinToZoneIndex(x)) {
						case 0:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 1, y);
							break;
						case 1:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 0, y);
							break;
						case 4:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 5, y);
							break;
						case 5:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 4, y);
							break;
						case 6:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 7, y);
							break;
						case 7:
							this.filter.changeZoneYByIndex(this.currentChannelIndex, 6, y);
							break;
					}
					break;
				case GraphicalFilterEditorControl.editModeSmoothNarrow:
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 3);
					break;
				case GraphicalFilterEditorControl.editModeSmoothWide:
					this.filter.changeSmoothY(this.currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 1);
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
			this.renderer.element.addEventListener("mousemove", this.boundMouseMove);
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

	public drawCurve(): void {
		if (this.renderer)
			this.renderer.drawCurve(this.showZones, this.isActualChannelCurveNeeded && !this.drawingMode, this.currentChannelIndex);
	}
}
