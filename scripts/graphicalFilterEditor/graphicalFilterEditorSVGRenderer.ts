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

class GraphicalFilterEditorSVGRenderer extends GraphicalFilterEditorRenderer<HTMLDivElement> {
	private readonly _svg: SVGElement;
	private readonly _svgGradient: SVGLinearGradientElement;
	private readonly _svgZones: SVGElement;
	private readonly _svgGrayCurve: SVGElement;
	private readonly _svgCurve: SVGElement;
	private readonly _svgLines: SVGLineElement[];

	private _pixelRatio: number;
	private _showZones: boolean;
	private _isActualChannelCurveNeeded: boolean;

	public constructor(editor: GraphicalFilterEditorControl) {
		super(document.createElement("div"), Math.abs(GraphicalFilterEditorControl.controlWidth - GraphicalFilterEditor.visibleBinCount) >> 1, editor);

		this.element.className = "GECV";
		this.element.style.overflow = "hidden";
		this.element.style.backgroundColor = "#303030";

		this.element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1" version="1.1" style="transform-origin: top left; pointer-events: none;">
			<defs>
				<linearGradient id="editorSVGLinearGradient" x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#ff0000" />
					<stop offset="0.1875" stop-color="#ffff00" />
					<stop offset="0.39453125" stop-color="#00ff00" />
					<stop offset="0.60546875" stop-color="#00ffff" />
					<stop offset="0.796875" stop-color="#0000ff" />
					<stop offset="1" stop-color="#ff00ff" />
				</linearGradient>
			</defs>
			<line x1="0" y1="0" x2="1" y2="0" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
			<line x1="0" y1="0" x2="1" y2="0" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
			<g style="display:none">
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="0" y1="0" x2="0" y2="1" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
			</g>
			<path style="fill:none;stroke:#707070;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter" d="M 0,0 1,0" />
			<path style="fill:none;stroke:url(#editorSVGLinearGradient);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter" d="M 0,0 1,0" />
		</svg>`;

		this._pixelRatio = 1;
		this._showZones = false;
		this._isActualChannelCurveNeeded = true;

		const svg = this.element.firstChild as SVGElement;
		this._svg = svg;
		this._svgGradient = svg.getElementsByTagName("linearGradient")[0];
		this._svgZones = svg.getElementsByTagName("g")[0];
		const paths = svg.getElementsByTagName("path");
		this._svgGrayCurve = paths[0];
		this._svgCurve = paths[1];
		const svgLines = svg.getElementsByTagName("line");
		this._svgLines = new Array(svgLines.length);
		for (let i = svgLines.length - 1; i >= 0; i--)
			this._svgLines[i] = svgLines[i];

		this.scaleChanged();
	}

	public scaleChanged(): void {
		const element = this.element,
			editor = this.editor,
			filter = editor.filter,
			svg = this._svg;

		if (!element || !editor || !filter || !svg)
			return;

		const visibleBinCount = GraphicalFilterEditor.visibleBinCount,
			controlWidth = GraphicalFilterEditorControl.controlWidth,
			controlHeight = GraphicalFilterEditorControl.controlHeight,
			pixelRatio = (devicePixelRatio > 1 ? devicePixelRatio : 1),
			editorScale = editor.scale,
			scale = editorScale * pixelRatio,
			canvasLeftMargin = this.leftMargin,
			canvasWidth = (controlWidth * scale) | 0,
			canvasHeight = (controlHeight * scale) | 0,	
			svgLines = this._svgLines;

		let lineWidth = (scale < 1 ? scale : (scale | 0)),
			halfLineWidth = lineWidth * 0.5,
			x = canvasWidth.toString(),
			y = canvasHeight.toString();

		svg.setAttribute("width", x);
		svg.setAttribute("height", y);
		svg.setAttribute("viewBox", `0 0 ${x} ${y}`);
		svg.style.transform = ((pixelRatio === 1) ? "" : ("scale(" + (1 / pixelRatio) + ")"));
		this._svgGradient.setAttribute("y2", y);
		editor.element.style.width = ((controlWidth * editorScale) | 0) + "px";
		element.style.width = ((controlWidth * editorScale) | 0) + "px";
		element.style.height = ((controlHeight * editorScale) | 0) + "px";

		svgLines[0].setAttribute("x2", x);
		svgLines[1].setAttribute("x2", x);
		for (let i = svgLines.length - 1; i >= 2; i--)
			svgLines[i].setAttribute("y2", y);

		y = (((GraphicalFilterEditor.zeroChannelValueY * scale) | 0) + halfLineWidth).toString();
		svgLines[0].setAttribute("y1", y);
		svgLines[0].setAttribute("y2", y);

		y = (((GraphicalFilterEditor.validYRangeHeight * scale) | 0) + halfLineWidth).toString();
		svgLines[1].setAttribute("y1", y);
		svgLines[1].setAttribute("y2", y);

		for (let i = filter.equivalentZonesFrequencyCount.length - 2; i > 0; i--) {
			x = ((((filter.equivalentZonesFrequencyCount[i] + canvasLeftMargin) * scale) | 0) + halfLineWidth).toString();
			svgLines[i + 1].setAttribute("x1", x);
			svgLines[i + 1].setAttribute("x2", x);
		}

		x = lineWidth.toString() + "px";
		y = ((4 * scale) | 0).toString();
		for (let i = svgLines.length - 1; i >= 0; i--) {
			svgLines[i].setAttribute("stroke-width", x);
			svgLines[i].setAttribute("stroke-dasharray", y);
		}

		lineWidth = (scale < 1 ? (scale * 2) : ((scale * 2) | 0));
		x = lineWidth.toString() + "px";

		this._svgGrayCurve.style.strokeWidth = x;
		this._svgCurve.style.strokeWidth = x;

		this._pixelRatio = pixelRatio;
	}

	public drawCurve(showZones: boolean, isActualChannelCurveNeeded: boolean, currentChannelIndex: number): void {
		let pixelRatio = (devicePixelRatio > 1 ? devicePixelRatio : 1);
		if (pixelRatio !== this._pixelRatio) {
			this.scaleChanged();
			pixelRatio = this._pixelRatio;
		}

		if (this._showZones !== showZones) {
			this._showZones = showZones;
			this._svgZones.style.display = (showZones ? "" : "none");
		}

		const editor = this.editor,
			filter = editor.filter,
			scale = editor.scale * pixelRatio,
			lineWidth = (scale < 1 ? (scale * 2) : ((scale * 2) | 0)),
			halfLineWidth = lineWidth * 0.5,
			canvasLeftMargin = this.leftMargin,
			visibleBinCount = GraphicalFilterEditor.visibleBinCount;

		for (let turn = (isActualChannelCurveNeeded ? 1 : 0); turn >= 0; turn--) {
			const curve = ((turn || !isActualChannelCurveNeeded) ? filter.channelCurves[currentChannelIndex] : filter.actualChannelCurve),
				svgCurve = (turn ? this._svgGrayCurve : this._svgCurve);

			let x = 1,
				lastX = 0,
				lastY = curve[0],
				str = "M " + ((canvasLeftMargin * scale) | 0) + "," + ((lastY * scale) + halfLineWidth);

			for (; x < visibleBinCount; x++) {
				const y = curve[x];
				if (y === lastY)
					continue;

				if (x > (lastX + 1) && x > 1)
					str += " " + (((canvasLeftMargin + x - 1) * scale) | 0) + "," + ((curve[x - 1] * scale) + halfLineWidth);

				lastX = x;
				lastY = curve[x];
				str += " " + (((canvasLeftMargin + lastX) * scale) | 0) + "," + ((lastY * scale) + halfLineWidth);
			}

			// Just to fill up the last pixel!
			str += " " + (((canvasLeftMargin + x) * scale) | 0) + "," + ((curve[x - 1] * scale) + halfLineWidth);
			svgCurve.setAttribute("d", str);
		}

		if (this._isActualChannelCurveNeeded !== isActualChannelCurveNeeded) {
			this._isActualChannelCurveNeeded = isActualChannelCurveNeeded;
			this._svgGrayCurve.style.display = (isActualChannelCurveNeeded ? "" : "none");
		}
	}
}
