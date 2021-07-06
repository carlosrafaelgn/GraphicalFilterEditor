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

abstract class Analyzer {
	public static readonly controlWidth = GraphicalFilterEditorControl.controlWidth;
	public static readonly controlHeight = Analyzer.controlWidth;

	protected static readonly colors = ["#000000", "#0B00B2", "#0C00B1", "#0E00AF", "#0E00AF", "#0F00AE", "#1000AD", "#1200AC", "#1300AB", "#1500AB", "#1600AA", "#1700A9", "#1900A8", "#1A00A6", "#1B00A6", "#1D00A4", "#1F00A3", "#2000A1", "#2200A1", "#2300A0", "#25009E", "#27009D", "#29009C", "#2B009A", "#2D0099", "#2E0098", "#300096", "#320095", "#340094", "#360092", "#380090", "#39008F", "#3C008E", "#3E008C", "#40008B", "#420089", "#440088", "#470086", "#480085", "#4B0083", "#4C0082", "#4F0080", "#51007F", "#54007C", "#56007C", "#57007A", "#5A0078", "#5C0076", "#5F0075", "#610073", "#640071", "#65006F", "#68006E", "#6B006C", "#6D006A", "#6F0069", "#710066", "#740065", "#760063", "#790062", "#7B0060", "#7D005E", "#80005C", "#82005B", "#850059", "#860057", "#890056", "#8C0054", "#8E0052", "#910050", "#93004F", "#96004D", "#97004B", "#9A0049", "#9C0048", "#9F0046", "#A10045", "#A40043", "#A60040", "#A8003F", "#AA003E", "#AD003C", "#AF003A", "#B10039", "#B30037", "#B60035", "#B80034", "#BA0032", "#BC0031", "#BE002E", "#C1002D", "#C3002C", "#C5002A", "#C70028", "#CA0027", "#CB0025", "#CE0024", "#CF0023", "#D10022", "#D30020", "#D6001E", "#D7001D", "#D9001B", "#DB001A", "#DD0019", "#DF0017", "#E10017", "#E20015", "#E40014", "#E60012", "#E70011", "#E90010", "#EA000F", "#EC000D", "#ED000C", "#EF000B", "#F1000B", "#F2000A", "#F40008", "#F50007", "#F60006", "#F70005", "#F90005", "#F90003", "#FB0003", "#FC0002", "#FD0001", "#FE0001", "#FF0000", "#FF0100", "#FF0200", "#FF0300", "#FF0500", "#FF0600", "#FF0600", "#FF0800", "#FF0900", "#FF0B00", "#FF0C00", "#FF0D00", "#FF0F00", "#FF1000", "#FF1200", "#FF1400", "#FF1500", "#FF1700", "#FF1900", "#FF1A00", "#FF1C00", "#FF1D00", "#FF2000", "#FF2200", "#FF2300", "#FF2500", "#FF2700", "#FF2900", "#FF2B00", "#FF2D00", "#FF2F00", "#FF3100", "#FF3400", "#FF3500", "#FF3700", "#FF3900", "#FF3C00", "#FF3E00", "#FF4000", "#FF4200", "#FF4400", "#FF4700", "#FF4900", "#FF4B00", "#FF4E00", "#FF5000", "#FF5200", "#FF5500", "#FF5700", "#FF5900", "#FF5C00", "#FF5E00", "#FF6100", "#FF6300", "#FF6600", "#FF6800", "#FF6A00", "#FF6C00", "#FF6F00", "#FF7200", "#FF7400", "#FF7700", "#FF7900", "#FF7C00", "#FF7E00", "#FF8000", "#FF8300", "#FF8500", "#FF8700", "#FF8A00", "#FF8D00", "#FF8F00", "#FF9200", "#FF9500", "#FF9700", "#FF9900", "#FF9B00", "#FF9E00", "#FFA000", "#FFA300", "#FFA500", "#FFA700", "#FFA900", "#FFAC00", "#FFAE00", "#FFB100", "#FFB200", "#FFB600", "#FFB700", "#FFBA00", "#FFBC00", "#FFBE00", "#FFC100", "#FFC300", "#FFC400", "#FFC700", "#FFC900", "#FFCB00", "#FFCD00", "#FFCF00", "#FFD100", "#FFD300", "#FFD500", "#FFD700", "#FFD900", "#FFDB00", "#FFDD00", "#FFDE00", "#FFE000", "#FFE100", "#FFE400", "#FFE500", "#FFE700", "#FFE900", "#FFEA00", "#FFEB00", "#FFED00", "#FFEF00", "#FFF000", "#FFF100", "#FFF300", "#FFF400", "#FFF500", "#FFF600", "#FFF800", "#FFF900", "#FFFA00", "#FFFB00"];

	protected audioContext: AudioContext;
	protected canvas: HTMLCanvasElement;
	protected ctx: CanvasRenderingContext2D | null;

	private alive = false;
	private lastRequest = 0;

	private boundAnalyze: any = null;

	public constructor(audioContext: AudioContext, parent: HTMLElement, id?: string, ignoreContext?: boolean, controlWidth?: number, controlHeight?: number) {
		this.audioContext = audioContext;

		this.canvas = document.createElement("canvas");
		this.canvas.width = ((!controlWidth || controlWidth <= 0) ? Analyzer.controlWidth : controlWidth);
		this.canvas.height = ((!controlHeight || controlHeight <= 0) ? Analyzer.controlHeight : controlHeight);
		this.canvas.style.position = "relative";
		this.canvas.style.margin = "0px";
		this.canvas.style.padding = "0px";
		this.canvas.style.verticalAlign = "top";
		this.canvas.style.display = "inline-block";
		this.canvas.style.cursor = "default";

		if (id)
			this.canvas.id = id;

		this.ctx = (ignoreContext ? null : this.canvas.getContext("2d", { alpha: false }));
		parent.appendChild(this.canvas);

		this.boundAnalyze = (time: number) => {
			if (!this.alive) {
				this.lastRequest = 0;
				return;
			}

			this.lastRequest = requestAnimationFrame(this.boundAnalyze);

			this.analyze(time);
		};
	}

	public destroy(): void {
		this.stop();

		this.cleanUp();

		if (this.canvas && this.canvas.parentNode)
			this.canvas.parentNode.removeChild(this.canvas);

		zeroObject(this);
	}

	public start(): boolean {
		if (this.alive)
			return false;

		this.alive = true;
		this.lastRequest = requestAnimationFrame(this.boundAnalyze);

		return true;
	}

	public stop(): void {
		this.alive = false;

		if (this.lastRequest) {
			cancelAnimationFrame(this.lastRequest);
			this.lastRequest = 0;
		}
	}

	protected abstract analyze(time: number): void;

	protected abstract cleanUp(): void;
}
