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

let cLib: CLib = null;

function cancelEvent(e: Event): boolean {
	if (e) {
		if ("isCancelled" in e)
			(e as any).isCancelled = true;
		if ("preventDefault" in e)
			e.preventDefault();
		if ("stopPropagation" in e)
			e.stopPropagation();
	}
	return false;
}

function lerp(x0: number, y0: number, x1: number, y1: number, x: number): number {
	return ((x - x0) * (y1 - y0) / (x1 - x0)) + y0;
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
					(v as Array<Object>).fill(null);
				o[p] = null;
				break;
		}
	}
}

function setup(): void {
	(window["CLib"]() as Promise<CLib>).then((value) => {
		cLib = value;
		if (window["main"])
			window["main"]();
	}, (reason) => {
		alert(reason);
		throw reason;
	});
}

setup();
