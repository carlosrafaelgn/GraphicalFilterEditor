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
	private readonly documentTarget: HTMLElement;
	private readonly element: HTMLElement;
	
	private readonly downCallback: BooleanPointerHandler | null;
	private readonly moveCallback: VoidPointerHandler | null;
	private readonly upCallback: VoidPointerHandler | null;
	
	private readonly documentDownEvent: string;
	private readonly documentMoveEvent: string;
	private readonly documentUpEvent: string;
	private readonly documentCancelEvent: string | null;
	private readonly elementHasExtraTouchStartHandler: boolean;

	private readonly boundDocumentDown: any;
	private readonly boundDocumentMove: any;
	private readonly boundDocumentUp: any;

	private captured: boolean;
	private pointerId: number;

	public constructor(element: HTMLElement, downCallback: BooleanPointerHandler | null = null, moveCallback: VoidPointerHandler | null = null, upCallback: VoidPointerHandler | null = null) {
		this.documentTarget = (document.documentElement || document.body);
		this.element = element;

		this.downCallback = downCallback;
		this.moveCallback = moveCallback;
		this.upCallback = upCallback;

		this.elementHasExtraTouchStartHandler = false;

		if ("onpointerdown" in element) {
			this.documentDownEvent = "pointerdown";
			this.documentMoveEvent = "pointermove";
			this.documentUpEvent = "pointerup";
			this.documentCancelEvent = "pointercancel";

			this.boundDocumentDown = this.pointerDown.bind(this);
			this.boundDocumentUp = this.pointerUp.bind(this);
			this.boundDocumentMove = this.pointerMove.bind(this);

			// Firefox mobile and a few iOS devices cause a buggy behavior if trying to handle
			// pointerdown/move/up but not touchstart/end/cancel...
			if ("ontouchstart" in element) {
				this.elementHasExtraTouchStartHandler = true;
				element.addEventListener("touchstart", cancelEvent);
			}
		} else if ("ontouchstart" in element) {
			this.documentDownEvent = "touchstart";
			this.documentMoveEvent = "touchmove";
			this.documentUpEvent = "touchend";
			this.documentCancelEvent = "touchcancel";

			this.boundDocumentDown = this.touchStart.bind(this);
			this.boundDocumentUp = this.touchEnd.bind(this);
			this.boundDocumentMove = this.touchMove.bind(this);
		} else {
			this.documentDownEvent = "mousedown";
			this.documentMoveEvent = "mousemove";
			this.documentUpEvent = "mouseup";
			this.documentCancelEvent = null;

			this.boundDocumentDown = this.mouseDown.bind(this);
			this.boundDocumentUp = this.mouseUp.bind(this);
			this.boundDocumentMove = this.mouseMove.bind(this);
		}

		element.addEventListener(this.documentDownEvent, this.boundDocumentDown);
		// Firefox mobile and a few iOS devices treat a few events on the root element as passive by default
		// https://stackoverflow.com/a/49853392/3569421
		// https://stackoverflow.com/a/57076149/3569421
		this.documentTarget.addEventListener(this.documentMoveEvent, this.boundDocumentMove, { capture: true, passive: false });
		this.documentTarget.addEventListener(this.documentUpEvent, this.boundDocumentUp, true);
		if (this.documentCancelEvent)
			this.documentTarget.addEventListener(this.documentCancelEvent, this.boundDocumentUp, true);

		this.captured = false;
		this.pointerId = -1;
	}

	public destroy(): void {
		if (this.element) {
			if (this.boundDocumentDown)
				this.element.removeEventListener(this.documentDownEvent, this.boundDocumentDown);
			if (this.elementHasExtraTouchStartHandler)
				this.element.removeEventListener("touchstart", cancelEvent);
		}

		if (this.documentTarget) {
			if (this.boundDocumentUp) {
				this.documentTarget.removeEventListener(this.documentUpEvent, this.boundDocumentUp, true);
				if (this.documentCancelEvent)
					this.documentTarget.removeEventListener(this.documentCancelEvent, this.boundDocumentUp, true);
			}

			if (this.boundDocumentMove)
				this.documentTarget.removeEventListener(this.documentMoveEvent, this.boundDocumentMove, true);
		}

		this.mouseUp({} as MouseEvent);

		zeroObject(this);
	}

	private pointerDown(e: PointerEvent): boolean | undefined {
		if (this.pointerId >= 0 && e.pointerType !== "mouse")
			return cancelEvent(e);

		const ret = this.mouseDown(e);

		if (this.captured)
			this.pointerId = e.pointerId;

		return ret;
	}

	private pointerMove(e: PointerEvent): boolean | undefined {
		if (!this.captured || e.pointerId !== this.pointerId)
			return;

		return this.mouseMove(e);
	}

	private pointerUp(e: PointerEvent): boolean | undefined {
		if (!this.captured || e.pointerId !== this.pointerId)
			return;

		this.pointerId = -1;

		return this.mouseUp(e);
	}

	private touchStart(e: TouchEvent): boolean | undefined {
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

	private touchMove(e: TouchEvent): boolean | undefined {
		if (!this.captured || e.touches.length > 1)
			return;

		(e as any).clientX = e.touches[0].clientX;
		(e as any).clientY = e.touches[0].clientY;

		return this.mouseMove(e as any);
	}

	private touchEnd(e: TouchEvent): boolean | undefined {
		if (!this.captured || this.pointerId < 0)
			return;

		this.pointerId = -1;

		return this.mouseUp(e as any);
	}

	private mouseDown(e: MouseEvent): boolean | undefined {
		this.mouseUp(e);

		if (e.button || (e.target && e.target !== this.element))
			return;

		if (this.downCallback && !this.downCallback(e))
			return cancelEvent(e);

		this.captured = true;

		return cancelEvent(e);
	}

	private mouseMove(e: MouseEvent): boolean | undefined {
		if (!this.captured)
			return;

		if (this.moveCallback)
			this.moveCallback(e);

		return cancelEvent(e);
	}

	private mouseUp(e: MouseEvent): boolean | undefined {
		if (!this.captured)
			return;

		this.captured = false;

		if (this.upCallback)
			this.upCallback(e);

		return cancelEvent(e);
	}
}
