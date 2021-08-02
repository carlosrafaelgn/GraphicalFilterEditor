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

let cLib: CLib;

function cancelEvent(e: Event): boolean {
	if (e) {
		if ("isCancelled" in e)
			(e as any).isCancelled = true;
		if (("preventDefault" in e) && (!("cancelable" in e) || e.cancelable))
			e.preventDefault();
		if ("stopPropagation" in e)
			e.stopPropagation();
	}
	return false;
}

function lerp(x0: number, y0: number, x1: number, y1: number, x: number): number {
	return ((x - x0) * (y1 - y0) / (x1 - x0)) + y0;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
	const t = (x - edge0) / (edge1 - edge0);
	return ((t <= 0.0) ? 0.0 :
		((t >= 1.0) ? 1.0 :
			(t * t * (3.0 - (2.0 * t)))
		)
	);
}

function zeroObject(o: any): void {
	for (let p in o) {
		switch (typeof o[p]) {
			case "function":
				break;
			case "boolean":
				o[p] = false;
				break;
			case "number":
				o[p] = 0;
				break;
			default:
				const v = o[p];
				if (Array.isArray(v))
					v.fill(null);
				o[p] = null;
				break;
		}
	}
}

function setup(): void {
	if (!Array.prototype.fill) {
		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/fill
		Array.prototype.fill = function (value: any, start?: number, end?: number): any {
			var i, length = this.length | 0;
			start = (start as number) | 0;
			end = ((end === undefined) ? length : (end | 0));
			end = ((end < 0) ? Math.max(length + end, 0) : Math.min(end, length));
			i = ((start < 0) ? Math.max(length + start, 0) : Math.min(start, length));
			while (i < end)
				this[i++] = value;
			return this;
		};
	}

	function finishLoading(options?: any): void {
		((window as any)["CLib"](options) as Promise<CLib>).then((value) => {
			cLib = value;
			if ((window as any)["main"])
				(window as any)["main"]();
		}, (reason) => {
			alert(reason);
			throw reason;
		});
	}

	const wasmBinaryReader: (() => (ArrayBuffer | PromiseLike<ArrayBuffer>)) | undefined = (window as any)["CLibWasmBinaryReader"];
	if (wasmBinaryReader) {
		Promise.resolve(wasmBinaryReader()).then((wasmBinary) => {
			finishLoading({ wasmBinary });
		}, () => {
			finishLoading();
		});
	} else {
		finishLoading();
	}
}

setup();
