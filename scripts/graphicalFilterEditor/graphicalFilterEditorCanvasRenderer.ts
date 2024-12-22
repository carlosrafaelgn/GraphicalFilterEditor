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

class GraphicalFilterEditorCanvasRenderer extends GraphicalFilterEditorRenderer<HTMLCanvasElement> {
	private _pixelRatio: number;
	private _ctx: CanvasRenderingContext2D;
	private _rangeImage: CanvasGradient;

	public constructor(editor: GraphicalFilterEditorControl) {
		super(document.createElement("canvas"), Math.abs(GraphicalFilterEditorControl.controlWidth - GraphicalFilterEditor.visibleBinCount) >> 1, editor);

		this.element.className = "GECV";

		this._pixelRatio = 1;
		this._ctx = null as any;
		this._rangeImage = null as any;

		this.scaleChanged();
	}

	public scaleChanged(): void {
		const element = this.element,
			editor = this.editor;

		if (!element || !editor)
			return;

		const controlWidth = GraphicalFilterEditorControl.controlWidth,
			controlHeight = GraphicalFilterEditorControl.controlHeight,
			pixelRatio = (devicePixelRatio > 1 ? devicePixelRatio : 1),
			editorScale = editor.scale,
			scale = editorScale * pixelRatio;

		element.width = (controlWidth * scale) | 0;
		element.height = (controlHeight * scale) | 0;
		editor.element.style.width = ((controlWidth * editorScale) | 0) + "px";
		element.style.width = ((controlWidth * editorScale) | 0) + "px";
		element.style.height = ((controlHeight * editorScale) | 0) + "px";

		const ctx = this.element.getContext("2d", { alpha: false });
		if (!ctx)
			throw new Error("Null canvas context");

		const rangeImage = ctx.createLinearGradient(0, 0, 1, element.height);
		rangeImage.addColorStop(0, "#ff0000");
		rangeImage.addColorStop(0.1875, "#ffff00");
		rangeImage.addColorStop(0.39453125, "#00ff00");
		rangeImage.addColorStop(0.60546875, "#00ffff");
		rangeImage.addColorStop(0.796875, "#0000ff");
		rangeImage.addColorStop(1, "#ff00ff");

		this._pixelRatio = pixelRatio;
		this._ctx = ctx;
		this._rangeImage = rangeImage;
	}

	public drawCurve(showZones: boolean, isActualChannelCurveNeeded: boolean, currentChannelIndex: number): void {
		// All the halfLineWidth's here are because of this explanation:
		// http://stackoverflow.com/questions/195262/can-i-turn-off-antialiasing-on-an-html-canvas-element
		// "Draw your 1-pixel lines on coordinates like ctx.lineTo(10.5, 10.5). Drawing a one-pixel line
		// over the point (10, 10) means, that this 1 pixel at that position reaches from 9.5 to 10.5 which
		// results in two lines that get drawn on the canvas.

		const ctx = this._ctx;

		if (!ctx)
			return;

		let pixelRatio = (devicePixelRatio > 1 ? devicePixelRatio : 1);
		if (pixelRatio !== this._pixelRatio) {
			this.scaleChanged();
			pixelRatio = this._pixelRatio;
		}

		const editor = this.editor,
			filter = editor.filter,
			scale = editor.scale * pixelRatio,
			canvas = this.element,
			canvasLeftMargin = this.leftMargin,
			canvasWidth = canvas.width,
			canvasHeight = canvas.height,
			widthPlusMarginMinus1 = canvasLeftMargin + GraphicalFilterEditor.visibleBinCount - 1,
			dashGap = Math.round(8 * scale),
			dashLength = Math.round(4 * scale),
			dashCount = ((canvasWidth / dashGap) | 0) + 1,
			maximumChannelValueY = (GraphicalFilterEditor.maximumChannelValueY * scale) | 0;

		let lineWidth = (scale < 1 ? scale : (scale | 0)),
			halfLineWidth = lineWidth * 0.5;

		ctx.fillStyle = "#303030";
		ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = "#5a5a5a";
		ctx.beginPath();

		let x = canvasWidth + (dashLength >> 1),
			y = ((GraphicalFilterEditor.zeroChannelValueY * scale) | 0) + halfLineWidth;
		ctx.moveTo(x, y);
		for (let i = dashCount - 1; i >= 0; i--) {
			ctx.lineTo(x - dashLength, y);
			x -= dashGap;
			ctx.moveTo(x, y);
		}
		ctx.stroke();

		ctx.beginPath();
		x = canvasWidth + (dashLength >> 1),
		y = ((GraphicalFilterEditor.validYRangeHeight * scale) | 0) + halfLineWidth;
		ctx.moveTo(x, y);
		for (let i = dashCount - 1; i >= 0; i--) {
			ctx.lineTo(x - dashLength, y);
			x -= dashGap;
			ctx.moveTo(x, y);
		}
		ctx.stroke();

		if (showZones) {
			for (let i = filter.equivalentZonesFrequencyCount.length - 2; i > 0; i--) {
				x = (((filter.equivalentZonesFrequencyCount[i] + canvasLeftMargin) * scale) | 0) + halfLineWidth;
				y = maximumChannelValueY;

				ctx.beginPath();
				ctx.moveTo(x, y);

				while (y < canvasHeight) {
					ctx.lineTo(x, y + dashLength);
					y += dashGap;
					ctx.moveTo(x, y);
				}

				ctx.stroke();
			}
		}

		lineWidth = (scale < 1 ? (scale * 2) : ((scale * 2) | 0));
		halfLineWidth = lineWidth * 0.5;

		ctx.lineWidth = lineWidth;

		const visibleBinCountMinus1 = GraphicalFilterEditor.visibleBinCount - 1;

		for (let turn = (isActualChannelCurveNeeded ? 1 : 0); turn >= 0; turn--) {
			const curve = ((turn || !isActualChannelCurveNeeded) ? filter.channelCurves[currentChannelIndex] : filter.actualChannelCurve);

			ctx.strokeStyle = (turn ? "#707070" : this._rangeImage);
			ctx.beginPath();
			ctx.moveTo((canvasLeftMargin * scale) | 0, (curve[0] * scale) + halfLineWidth);

			for (x = 1; x < visibleBinCountMinus1; x++)
				ctx.lineTo(((canvasLeftMargin + x) * scale) | 0, (curve[x] * scale) + halfLineWidth);

			// Just to fill up the last pixel!
			ctx.lineTo(((canvasLeftMargin + x + 1) * scale) | 0, (curve[x] * scale) + halfLineWidth);
			ctx.stroke();
		}
	}
}
