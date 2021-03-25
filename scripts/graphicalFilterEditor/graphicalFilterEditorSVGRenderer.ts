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
	private readonly svg: SVGElement;
	private readonly svgZones: SVGElement;
	private readonly svgGrayCurve: SVGElement;
	private readonly svgCurve: SVGElement;

	private showZones: boolean;
	private isActualChannelCurveNeeded: boolean;

	public constructor(editor: GraphicalFilterEditorControl) {
		super(document.createElement("div"), Math.abs(GraphicalFilterEditorControl.ControlWidth - GraphicalFilterEditor.VisibleBinCount) >> 1, editor);

		const leftMargin = this.leftMargin,
			visibleBinCount = GraphicalFilterEditor.VisibleBinCount,
			controlWidth = GraphicalFilterEditorControl.ControlWidth,
			controlHeight = GraphicalFilterEditorControl.ControlHeight,
			validYRangeHeight = GraphicalFilterEditor.ValidYRangeHeight,
			zeroChannelValueY = GraphicalFilterEditor.ZeroChannelValueY;

		this.element.className = "GECV";
		this.element.style.backgroundColor = "#303030";
		this.element.style.width = ((controlWidth * editor.scale) | 0) + "px";
		this.element.style.height = ((controlHeight * editor.scale) | 0) + "px";

		this.element.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${controlWidth}" height="${controlHeight}" viewBox="0 0 ${controlWidth} ${controlHeight}" version="1.1" style="transform-origin: top left; transform: scale(${editor.scale}); pointer-events: none;">
			<defs>
				<linearGradient id="editorSVGLinearGradient" x1="0" y1="0" x2="0" y2="${controlHeight}" gradientUnits="userSpaceOnUse">
					<stop offset="0" stop-color="#ff0000" />
					<stop offset="0.1875" stop-color="#ffff00" />
					<stop offset="0.39453125" stop-color="#00ff00" />
					<stop offset="0.60546875" stop-color="#00ffff" />
					<stop offset="0.796875" stop-color="#0000ff" />
					<stop offset="1" stop-color="#ff00ff" />
				</linearGradient>
			</defs>
			<line x1="0" y1="${zeroChannelValueY + 0.5}" x2="${controlWidth}" y2="${zeroChannelValueY + 0.5}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
			<line x1="0" y1="${validYRangeHeight + 0.5}" x2="${controlWidth}" y2="${validYRangeHeight + 0.5}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
			<g style="display:none">
				<line x1="${leftMargin + (50 * 1) + 0.5}" y1="0" x2="${leftMargin + (50 * 1) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 2) + 0.5}" y1="0" x2="${leftMargin + (50 * 2) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 3) + 0.5}" y1="0" x2="${leftMargin + (50 * 3) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 4) + 0.5}" y1="0" x2="${leftMargin + (50 * 4) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 5) + 0.5}" y1="0" x2="${leftMargin + (50 * 5) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 6) + 0.5}" y1="0" x2="${leftMargin + (50 * 6) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 7) + 0.5}" y1="0" x2="${leftMargin + (50 * 7) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 8) + 0.5}" y1="0" x2="${leftMargin + (50 * 8) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
				<line x1="${leftMargin + (50 * 9) + 0.5}" y1="0" x2="${leftMargin + (50 * 9) + 0.5}" y2="${controlHeight}" stroke="#5a5a5a" stroke-width="1px" stroke-dasharray="4" />
			</g>
			<path style="fill:none;stroke:#707070;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter" d="M ${leftMargin},${zeroChannelValueY + 0.5} ${visibleBinCount + leftMargin},${zeroChannelValueY + 0.5}" />
			<path style="fill:none;stroke:url(#editorSVGLinearGradient);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter" d="M ${leftMargin},${zeroChannelValueY + 0.5} ${visibleBinCount + leftMargin},${zeroChannelValueY + 0.5}" />
		</svg>`;

		this.showZones = false;
		this.isActualChannelCurveNeeded = true;

		const svg = this.element.firstChild as SVGElement;
		this.svg = svg;
		this.svgZones = svg.getElementsByTagName("g")[0];
		const paths = svg.getElementsByTagName("path");
		this.svgGrayCurve = paths[0];
		this.svgCurve = paths[1];
	}

	public scaleChanged(): void {
		const element = this.element,
			editor = this.editor;

		if (!element || !editor)
			return;

		const scale = editor.scale;

		element.style.width = ((GraphicalFilterEditorControl.ControlWidth * scale) | 0) + "px";
		element.style.height = ((GraphicalFilterEditorControl.ControlHeight * scale) | 0) + "px";

		if (this.svg)
			this.svg.style.transform = "scale(" + editor.scale + ")";
	}

	public drawCurve(showZones: boolean, isActualChannelCurveNeeded: boolean, currentChannelIndex: number): void {
		if (this.showZones !== showZones) {
			this.showZones = showZones;
			this.svgZones.style.display = (showZones ? "" : "none");
		}

		const editor = this.editor,
			filter = editor.filter,
			leftMargin = this.leftMargin,
			visibleBinCount = GraphicalFilterEditor.VisibleBinCount;
		let x: number,
			curve = filter.channelCurves[currentChannelIndex],
			svgCurve = (isActualChannelCurveNeeded ? this.svgGrayCurve : this.svgCurve),
			lastX = 0,
			lastY = curve[0],
			str = "M " + leftMargin + "," + (lastY + 0.5);

		for (x = 1; x < visibleBinCount; x++) {
			const y = curve[x];
			if (y === lastY)
				continue;
			if (x > (lastX + 1) && x > 1)
				str += " " + (x - 1 + leftMargin) + "," + (curve[x - 1] + 0.5);
			lastX = x;
			lastY = curve[x];
			str += " " + (lastX + leftMargin) + "," + (lastY + 0.5);
		}
		// Just to fill up the last pixel!
		str += " " + (x + leftMargin) + "," + curve[x - 1];
		svgCurve.setAttribute("d", str);

		if (isActualChannelCurveNeeded) {
			svgCurve = this.svgCurve;
			curve = filter.actualChannelCurve;
			lastX = 0;
			lastY = curve[0];
			str = "M " + leftMargin + "," + (lastY + 0.5);

			for (x = 1; x < visibleBinCount; x++) {
				const y = curve[x];
				if (y === lastY)
					continue;
				if (x > (lastX + 1) && x > 1)
					str += " " + (x - 1 + leftMargin) + "," + (curve[x - 1] + 0.5);
				lastX = x;
				lastY = curve[x];
				str += " " + (lastX + leftMargin) + "," + (lastY + 0.5);
			}
			// Just to fill up the last pixel!
			str += " " + (x + leftMargin) + "," + (curve[x - 1] + 0.5);
			svgCurve.setAttribute("d", str);
		}

		if (this.isActualChannelCurveNeeded !== isActualChannelCurveNeeded) {
			this.isActualChannelCurveNeeded = isActualChannelCurveNeeded;
			this.svgGrayCurve.style.display = (isActualChannelCurveNeeded ? "" : "none");
		}
	}
}
