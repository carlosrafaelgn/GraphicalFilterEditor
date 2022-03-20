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
	fontSize?: string;
	lineHeight?: string;
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

	private _scale: number;
	private _fontSize: string | null;
	private _lineHeight: string | null;
	private _showZones = false;
	private _editMode = GraphicalFilterEditorControl.editModeRegular;
	private _isActualChannelCurveNeeded = true;
	private _currentChannelIndex = 0;
	private isSameFilterLR = true;
	private drawingMode = 0;
	private lastDrawX = 0;
	private lastDrawY = 0;
	private drawOffsetX = 0;
	private drawOffsetY = 0;

	private boundMouseMove: any;

	public constructor(element: HTMLDivElement, filterLength: number, audioContext: AudioContext, filterChangedCallback: FilterChangedCallback, settings?: GraphicalFilterEditorSettings | null, uiSettings?: GraphicalFilterEditorUISettings | null) {
		if (filterLength < 8 || (filterLength & (filterLength - 1)))
			throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";

		this.filter = new GraphicalFilterEditor(filterLength, audioContext, filterChangedCallback);

		const createMenuSep = function () {
				const s = document.createElement("div");
				s.className = "GEMNUSEP";
				return s;
			},
			createMenuLabel = function (text: string) {
				const l = document.createElement("div");
				l.className = "GEMNULBL";
				l.appendChild(document.createTextNode(text));
				return l;
			},
			createMenuItem = function (text: string, checkable: boolean, checked: boolean, radio: boolean, clickHandler: (e: MouseEvent) => any, className?: string | null) {
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
		element.setAttribute("aria-hidden", "true");

		this.boundMouseMove = this.mouseMove.bind(this);

		this._fontSize = null;
		if (uiSettings && uiSettings.fontSize)
			this.fontSize = uiSettings.fontSize;

		this._lineHeight = null;
		if (uiSettings && uiSettings.lineHeight)
			this.lineHeight = uiSettings.lineHeight;

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
		if ((uiSettings && uiSettings.hideEditModePeakingEq) || !this.filter.iirSupported)
			this.mnuEditPeakingEq.style.display = "none";
		mnuh.appendChild(this.mnuEditShelfEq = createMenuItem(GraphicalFilterEditorStrings.ShelfEq, true, false, true, this.mnuEditShelfEq_Click.bind(this)));
		if ((uiSettings && uiSettings.hideEditModeShelfEq) || !this.filter.iirSupported)
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
			this._showZones = settings.showZones;

		if (settings.editMode &&
			settings.editMode >= GraphicalFilterEditorControl.editModeFirst &&
			settings.editMode <= GraphicalFilterEditorControl.editModeLast &&
			(filter.iirSupported || (settings.editMode !== GraphicalFilterEditorControl.editModePeakingEq && settings.editMode !== GraphicalFilterEditorControl.editModeShelfEq)))
			this._editMode = settings.editMode;

		if (settings.isActualChannelCurveNeeded === false || settings.isActualChannelCurveNeeded === true)
			this._isActualChannelCurveNeeded = settings.isActualChannelCurveNeeded;

		if (settings.currentChannelIndex === 0 || settings.currentChannelIndex === 1)
			this._currentChannelIndex = settings.currentChannelIndex;

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
			this.checkMenu(this.mnuChBL, (this._currentChannelIndex === 0));
			this.checkMenu(this.mnuChL, false);
			this.checkMenu(this.mnuChBR, (this._currentChannelIndex === 1));
			this.checkMenu(this.mnuChR, false);
		} else {
			this.checkMenu(this.mnuChBL, false);
			this.checkMenu(this.mnuChL, (this._currentChannelIndex === 0));
			this.checkMenu(this.mnuChBR, false);
			this.checkMenu(this.mnuChR, (this._currentChannelIndex === 1));
		}

		const isNormalized = ((settings.isNormalized === false || settings.isNormalized === true) ? settings.isNormalized : filter.isNormalized);

		if (isNormalized === filter.isNormalized)
			filter.updateFilter(this._currentChannelIndex, this.isSameFilterLR, true);
		else
			filter.changeIsNormalized(isNormalized, this._currentChannelIndex, this.isSameFilterLR);

		if (this._isActualChannelCurveNeeded)
			this.filter.updateActualChannelCurve(this._currentChannelIndex);

		this.checkMenu(this.mnuShowZones, this._showZones);
		this.editMode = this._editMode;
		this.checkMenu(this.mnuNormalizeCurves, this.filter.isNormalized);
		this.checkMenu(this.mnuShowActual, this._isActualChannelCurveNeeded);

		this.drawCurve();
	}

	public saveSettings(): GraphicalFilterEditorSettings {
		return {
			showZones: this._showZones,
			editMode: this._editMode,
			isActualChannelCurveNeeded: this._isActualChannelCurveNeeded,
			currentChannelIndex: this._currentChannelIndex,
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
		if (!this._fontSize)
			this.element.style.fontSize = (12 * scale) + "px";
		if (!this._lineHeight)
			this.element.style.lineHeight = (16 * scale) + "px";

		if (this.renderer) {
			this.renderer.scaleChanged();
			this.drawCurve();
		}
	}

	public get fontSize(): string | null {
		return this._fontSize;
	}

	public set fontSize(fontSize: string | null) {
		if (this._fontSize === fontSize || !this.element)
			return;

		this._fontSize = fontSize;
		this.element.style.fontSize = (fontSize || ((12 * this._scale) + "px"));
	}

	public get lineHeight(): string | null {
		return this._lineHeight;
	}

	public set lineHeight(lineHeight: string | null) {
		if (this._lineHeight === lineHeight || !this.element)
			return;

		this._lineHeight = lineHeight;
		this.element.style.lineHeight = (lineHeight || ((16 * this._scale) + "px"));
	}

	public get showZones(): boolean {
		return this._showZones;
	}

	public set showZones(showZones: boolean) {
		this._showZones = showZones;
		this.checkMenu(this.mnuShowZones, showZones);
		this.drawCurve();
	}

	public get editMode(): number {
		return this._editMode;
	}

	public set editMode(editMode: number) {
		if (editMode < GraphicalFilterEditorControl.editModeFirst ||
			editMode > GraphicalFilterEditorControl.editModeLast ||
			(!this.filter.iirSupported && (editMode === GraphicalFilterEditorControl.editModePeakingEq || editMode === GraphicalFilterEditorControl.editModeShelfEq)))
			return;

		this._editMode = editMode;
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

			this.filter.changeIIRType(iirType, this._currentChannelIndex, this.isSameFilterLR);
			if (this._isActualChannelCurveNeeded) {
				this.filter.updateActualChannelCurve(this._currentChannelIndex);
				this.drawCurve();
			}
		}
	}

	public get isActualChannelCurveNeeded(): boolean {
		return this._isActualChannelCurveNeeded;
	}

	public set isActualChannelCurveNeeded(isActualChannelCurveNeeded: boolean) {
		this._isActualChannelCurveNeeded = isActualChannelCurveNeeded;
		this.checkMenu(this.mnuShowActual, isActualChannelCurveNeeded);
		if (isActualChannelCurveNeeded)
			this.filter.updateActualChannelCurve(this._currentChannelIndex);
		this.drawCurve();
	}

	public get currentChannelIndex(): number {
		return this._currentChannelIndex;
	}

	public get isNormalized(): boolean {
		return this.filter.isNormalized;
	}

	public set isNormalized(isNormalized: boolean) {
		this.filter.changeIsNormalized(isNormalized, this._currentChannelIndex, this.isSameFilterLR);
		this.checkMenu(this.mnuNormalizeCurves, isNormalized);
		if (this._isActualChannelCurveNeeded) {
			this.filter.updateActualChannelCurve(this._currentChannelIndex);
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
				this.mnu.style.bottom = (this.btnMnu.clientHeight) + "px";
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
			if (!this.isSameFilterLR || this._currentChannelIndex !== channelIndex) {
				if (this.isSameFilterLR) {
					this._currentChannelIndex = channelIndex;
					this.filter.updateFilter(channelIndex, true, true);
					if (this._isActualChannelCurveNeeded)
						this.filter.updateActualChannelCurve(channelIndex);
					this.drawCurve();
				} else {
					this.isSameFilterLR = true;
					this.filter.copyFilter(channelIndex, 1 - channelIndex);
					if (this._currentChannelIndex !== channelIndex) {
						this._currentChannelIndex = channelIndex;
						if (this._isActualChannelCurveNeeded)
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
			if (this.isSameFilterLR || this._currentChannelIndex !== channelIndex) {
				if (this.isSameFilterLR) {
					this.isSameFilterLR = false;
					this.filter.updateFilter(1 - this._currentChannelIndex, false, false);
				}
				if (this._currentChannelIndex !== channelIndex) {
					this._currentChannelIndex = channelIndex;
					if (this._isActualChannelCurveNeeded)
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
		if (!e.button)
			this.resetCurve();
		return this.btnMnu_Click(e);
	}

	private mnuShowZones_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.showZones = !this._showZones;
		return this.btnMnu_Click(e);
	}

	private mnuEditRegular_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.editMode = GraphicalFilterEditorControl.editModeRegular;
		return this.btnMnu_Click(e);
	}

	private mnuEditZones_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.editMode = GraphicalFilterEditorControl.editModeZones;
		return this.btnMnu_Click(e);
	}

	private mnuEditSmoothNarrow_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.editMode = GraphicalFilterEditorControl.editModeSmoothNarrow;
		return this.btnMnu_Click(e);
	}

	private mnuEditSmoothWide_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.editMode = GraphicalFilterEditorControl.editModeSmoothWide;
		return this.btnMnu_Click(e);
	}

	private mnuEditPeakingEq_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.editMode = GraphicalFilterEditorControl.editModePeakingEq;
		return this.btnMnu_Click(e);
	}

	private mnuEditShelfEq_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.editMode = GraphicalFilterEditorControl.editModeShelfEq;
		return this.btnMnu_Click(e);
	}

	private mnuNormalizeCurves_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.isNormalized = !this.filter.isNormalized;
		return this.btnMnu_Click(e);
	}

	private mnuShowActual_Click(e: MouseEvent): boolean {
		if (!e.button)
			this.isActualChannelCurveNeeded = !this._isActualChannelCurveNeeded;
		return this.btnMnu_Click(e);
	}

	private mouseDown(e: MouseEvent): boolean {
		if (!e.button && !this.drawingMode) {
			const rect = this.renderer.element.getBoundingClientRect(),
				x = (((e.clientX - rect.left) / this._scale) | 0) - this.renderer.leftMargin,
				y = (((e.clientY - rect.top) / this._scale) | 0);

			this.renderer.element.removeEventListener("mousemove", this.boundMouseMove);

			this.drawingMode = 1;

			switch (this._editMode) {
				case GraphicalFilterEditorControl.editModeZones:
				case GraphicalFilterEditorControl.editModePeakingEq:
					this.filter.changeZoneY(this._currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.editModeShelfEq:
					this.filter.changeShelfZoneY(this._currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.editModeSmoothNarrow:
					this.filter.startSmoothEdition(this._currentChannelIndex);
					this.filter.changeSmoothY(this._currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 3);
					break;
				case GraphicalFilterEditorControl.editModeSmoothWide:
					this.filter.startSmoothEdition(this._currentChannelIndex);
					this.filter.changeSmoothY(this._currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 1);
					break;
				default:
					this.filter.channelCurves[this._currentChannelIndex][this.filter.clampX(x)] = this.filter.clampY(y);
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

		let curve = this.filter.channelCurves[this._currentChannelIndex];

		if (this.drawingMode) {
			switch (this._editMode) {
				case GraphicalFilterEditorControl.editModeZones:
				case GraphicalFilterEditorControl.editModePeakingEq:
					this.filter.changeZoneY(this._currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.editModeShelfEq:
					this.filter.changeShelfZoneY(this._currentChannelIndex, x, y);
					break;
				case GraphicalFilterEditorControl.editModeSmoothNarrow:
					this.filter.changeSmoothY(this._currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 3);
					break;
				case GraphicalFilterEditorControl.editModeSmoothWide:
					this.filter.changeSmoothY(this._currentChannelIndex, x, y, GraphicalFilterEditor.visibleBinCount >> 1);
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
		} else if (this._isActualChannelCurveNeeded) {
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
			this.commitChanges();
		}
	}

	public resetCurve() {
		const curve = this.filter.channelCurves[this._currentChannelIndex];
		for (let i = curve.length - 1; i >= 0; i--)
			curve[i] = GraphicalFilterEditor.zeroChannelValueY;

		this.filter.updateFilter(this._currentChannelIndex, this.isSameFilterLR, false);
		if (this._isActualChannelCurveNeeded)
			this.filter.updateActualChannelCurve(this._currentChannelIndex);
		this.drawCurve();
	}

	public getZoneY(zoneIndex: number): number {
		return this.filter.getZoneY(this._currentChannelIndex, zoneIndex);
	}

	public changeZoneY(zoneIndex: number, y: number, removeActualChannelCurve?: boolean): void {
		this.filter.changeZoneYByIndex(this._currentChannelIndex, zoneIndex, y);
		this.drawCurve(removeActualChannelCurve);
	}

	public getShelfZoneY(shelfZoneIndex: number): number {
		return this.filter.getShelfZoneY(this._currentChannelIndex, shelfZoneIndex);
	}

	public changeShelfZoneY(shelfZoneIndex: number, y: number, removeActualChannelCurve?: boolean): void {
		this.filter.changeShelfZoneYByIndex(this._currentChannelIndex, shelfZoneIndex, y);
		this.drawCurve(removeActualChannelCurve);
	}

	public changeFilterY(x: number, y: number, removeActualChannelCurve?: boolean): void {
		this.filter.channelCurves[this._currentChannelIndex][this.filter.clampX(x)] = this.filter.clampY(y);
		this.drawCurve(removeActualChannelCurve);
	}

	public commitChanges(): void {
		this.filter.updateFilter(this._currentChannelIndex, this.isSameFilterLR, false);
		if (this._isActualChannelCurveNeeded)
			this.filter.updateActualChannelCurve(this._currentChannelIndex);
		this.drawCurve();
	}

	public changeFilterLength(newFilterLength: number): boolean {
		if (this.filter.changeFilterLength(newFilterLength, this._currentChannelIndex, this.isSameFilterLR)) {
			if (this._isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this._currentChannelIndex);
			this.drawCurve();
			return true;
		}
		return false;
	}

	public changeSampleRate(newSampleRate: number): boolean {
		if (this.filter.changeSampleRate(newSampleRate, this._currentChannelIndex, this.isSameFilterLR)) {
			if (this._isActualChannelCurveNeeded)
				this.filter.updateActualChannelCurve(this._currentChannelIndex);
			this.drawCurve();
			return true;
		}
		return false;
	}

	public changeAudioContext(newAudioContext: AudioContext): boolean {
		return this.filter.changeAudioContext(newAudioContext, this._currentChannelIndex, this.isSameFilterLR);
	}

	public drawCurve(removeActualChannelCurve?: boolean): void {
		if (this.renderer)
			this.renderer.drawCurve(this._showZones, !removeActualChannelCurve && this._isActualChannelCurveNeeded && !this.drawingMode, this._currentChannelIndex);
	}
}
