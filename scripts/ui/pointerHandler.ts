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

//
// This file came from my other project: https://github.com/carlosrafaelgn/pixel
//

"use strict";

interface BooleanPointerHandler {
	(event: MouseEvent): boolean;
}

interface VoidPointerHandler {
	(event: MouseEvent): void;
}

class PointerHandler {
	private captured = false;
	private pointerId = -1;

	private element: HTMLElement = null;

	private documentMoveEvent: string = null;
	private documentUpEvent: string = null;
	private documentCancelEvent: string = null;

	private downCallback: BooleanPointerHandler = null;
	private moveCallback: VoidPointerHandler = null;
	private upCallback: VoidPointerHandler = null;

	private boundDocumentUp: any = null;
	private boundDocumentMove: any = null;

	public constructor(element: HTMLElement, downCallback: BooleanPointerHandler = null, moveCallback: VoidPointerHandler = null, upCallback: VoidPointerHandler = null) {
		this.element = element;
		this.downCallback = downCallback;
		this.moveCallback = moveCallback;
		this.upCallback = upCallback;

		if ("onpointerdown" in element) {
			this.documentMoveEvent = "pointermove";
			this.documentUpEvent = "pointerup";
			this.documentCancelEvent = "pointercancel";

			this.boundDocumentUp = this.pointerUp.bind(this);
			this.boundDocumentMove = this.pointerMove.bind(this);

			element.onpointerdown = this.pointerDown.bind(this);
		} else if ("ontouchstart" in element) {
			this.documentMoveEvent = "touchmove";
			this.documentUpEvent = "touchup";
			this.documentCancelEvent = "touchcancel";

			this.boundDocumentUp = this.touchEnd.bind(this);
			this.boundDocumentMove = this.touchMove.bind(this);

			(element as any).ontouchstart = this.touchStart.bind(this);
		} else {
			this.documentMoveEvent = "mousemove";
			this.documentUpEvent = "mouseup";
			this.documentCancelEvent = null;

			this.boundDocumentUp = this.mouseUp.bind(this);
			this.boundDocumentMove = this.mouseMove.bind(this);

			(element as any).onmousedown = this.mouseDown.bind(this);
		}
	}

	public destroy(): void {
		this.mouseUp(null);

		zeroObject(this);
	}

	private pointerDown(e: PointerEvent): boolean {
		if (this.pointerId >= 0 && e.pointerType !== "mouse")
			return cancelEvent(e);

		const ret = this.mouseDown(e);

		if (this.captured)
			this.pointerId = e.pointerId;

		return ret;
	}

	private pointerMove(e: PointerEvent): boolean {
		if (!this.captured || e.pointerId !== this.pointerId)
			return;

		return this.mouseMove(e);
	}

	private pointerUp(e: PointerEvent): boolean {
		if (!this.captured || e.pointerId !== this.pointerId)
			return;

		this.pointerId = -1;

		return this.mouseUp(e);
	}

	private touchStart(e: TouchEvent): boolean {
		if (e.touches.length > 1)
			return;

		if (this.pointerId >= 0)
			this.touchEnd(e);

		this.pointerId = 1;

		(e as any).clientX = e.touches[0].clientX;
		(e as any).clientY = e.touches[0].clientY;

		let ret = this.mouseDown(e as any);
		if (ret === undefined)
			this.pointerId = -1;

		return ret;
	}

	private touchMove(e: TouchEvent): boolean {
		if (!this.captured || e.touches.length > 1)
			return;

		(e as any).clientX = e.touches[0].clientX;
		(e as any).clientY = e.touches[0].clientY;

		return this.mouseMove(e as any);
	}

	private touchEnd(e: TouchEvent): boolean {
		if (!this.captured || this.pointerId < 0)
			return;

		this.pointerId = -1;

		return this.mouseUp(e as any);
	}

	private mouseDown(e: MouseEvent): boolean {
		this.mouseUp(e);

		if (e.button || (e.target && e.target !== this.element))
			return;

		if (this.downCallback && !this.downCallback(e))
			return cancelEvent(e);

		this.captured = true;

		document.addEventListener(this.documentMoveEvent, this.boundDocumentMove, true);
		document.addEventListener(this.documentUpEvent, this.boundDocumentUp, true);
		if (this.documentCancelEvent)
			document.addEventListener(this.documentCancelEvent, this.boundDocumentUp, true);

		return cancelEvent(e);
	}

	private mouseMove(e: MouseEvent): boolean {
		if (!this.captured)
			return;

		if (this.moveCallback)
			this.moveCallback(e);

		return cancelEvent(e);
	}

	private mouseUp(e: MouseEvent): boolean {
		if (!this.captured)
			return;

		document.removeEventListener(this.documentUpEvent, this.boundDocumentUp, true);
		document.removeEventListener(this.documentMoveEvent, this.boundDocumentMove, true);
		if (this.documentCancelEvent)
			document.removeEventListener(this.documentCancelEvent, this.boundDocumentUp, true);

		this.captured = false;

		if (this.upCallback)
			this.upCallback(e);

		return cancelEvent(e);
	}
}
