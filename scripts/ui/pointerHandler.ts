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
interface OutsidePointerHandler {
	(e: Event): boolean;
}

interface BooleanPointerHandler {
	(e: MouseEvent): boolean;
}

interface VoidPointerHandler {
	(e: MouseEvent): void;
}

class PointerHandler {
	private readonly _documentTarget: HTMLElement;
	private readonly _element: HTMLElement;

	private readonly _downCallback: BooleanPointerHandler | null;
	private readonly _moveCallback: VoidPointerHandler | null;
	private readonly _upCallback: VoidPointerHandler | null;

	private readonly _documentDownEvent: string;
	private readonly _documentMoveEvent: string;
	private readonly _documentUpEvent: string;
	private readonly _documentCancelEvent: string | null;

	private readonly _boundDocumentDown: any;
	private readonly _boundDocumentMove: any;
	private readonly _boundDocumentUp: any;
	private readonly _boundExtraTouchStart: any;

	private readonly _lazy: boolean;

	private readonly _outsidePointerHandler: OutsidePointerHandler | null;

	private _captured: boolean;
	private _pointerId: number;

	public constructor(element: HTMLElement, downCallback: BooleanPointerHandler | null = null, moveCallback: VoidPointerHandler | null = null, upCallback: VoidPointerHandler | null = null, lazy: boolean = true, outsidePointerHandler: OutsidePointerHandler | null = null) {
		this._documentTarget = (document.documentElement || document.body);
		this._element = element;

		this._downCallback = downCallback;
		this._moveCallback = moveCallback;
		this._upCallback = upCallback;

		this._boundExtraTouchStart = null;

		// If the element using the PointerHandler wants to track pointer/touch position,
		// it is important not to forget to add the touch-action CSS property, with a value
		// like none (or similiar, depending on the case) to prevent pointercancel/touchcancel
		// events from happening when the touch actually starts outside the element, and
		// sometimes, even when the touch starts inside it.
		// https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/pointercancel_event
		if ("onpointerdown" in element) {
			this._documentDownEvent = "pointerdown";
			this._documentMoveEvent = "pointermove";
			this._documentUpEvent = "pointerup";
			this._documentCancelEvent = "pointercancel";

			this._boundDocumentDown = this.pointerDown.bind(this);
			this._boundDocumentUp = this.pointerUp.bind(this);
			this._boundDocumentMove = this.pointerMove.bind(this);

			// Firefox mobile and a few iOS devices cause a buggy behavior if trying to handle
			// pointerdown/move/up but not touchstart/end/cancel...
			if ("ontouchstart" in element)
				this._boundExtraTouchStart = this.extraTouchStart.bind(this);
		} else if ("ontouchstart" in element) {
			this._documentDownEvent = "touchstart";
			this._documentMoveEvent = "touchmove";
			this._documentUpEvent = "touchend";
			this._documentCancelEvent = "touchcancel";

			this._boundDocumentDown = this.touchStart.bind(this);
			this._boundDocumentUp = this.touchEnd.bind(this);
			this._boundDocumentMove = this.touchMove.bind(this);
		} else {
			this._documentDownEvent = "mousedown";
			this._documentMoveEvent = "mousemove";
			this._documentUpEvent = "mouseup";
			this._documentCancelEvent = null;

			this._boundDocumentDown = this.mouseDown.bind(this);
			this._boundDocumentUp = this.mouseUp.bind(this);
			this._boundDocumentMove = this.mouseMove.bind(this);
		}

		this._lazy = lazy;

		this._outsidePointerHandler = outsidePointerHandler;

		if (this._boundExtraTouchStart)
			element.addEventListener("touchstart", this._boundExtraTouchStart);
		element.addEventListener(this._documentDownEvent, this._boundDocumentDown);

		if (!lazy)
			this.addSecondaryHandlers();

		this._captured = false;
		this._pointerId = -1;
	}

	public destroy(): void {
		if (this._element) {
			if (this._boundExtraTouchStart)
				this._element.removeEventListener("touchstart", this._boundExtraTouchStart);
			if (this._boundDocumentDown)
				this._element.removeEventListener(this._documentDownEvent, this._boundDocumentDown);
		}

		this.removeSecondaryHandlers();

		this.mouseUp({} as MouseEvent);

		zeroObject(this);
	}

	public get captured(): boolean {
		return this._captured;
	}

	private addSecondaryHandlers(): void {
		if (!this._documentTarget)
			return;

		// Firefox mobile and a few iOS devices treat a few events on the root element as passive by default
		// https://stackoverflow.com/a/49853392/3569421
		// https://stackoverflow.com/a/57076149/3569421
		this._documentTarget.addEventListener(this._documentMoveEvent, this._boundDocumentMove, { capture: true, passive: false });
		this._documentTarget.addEventListener(this._documentUpEvent, this._boundDocumentUp, true);
		if (this._documentCancelEvent)
			this._documentTarget.addEventListener(this._documentCancelEvent, this._boundDocumentUp, true);
	}

	private removeSecondaryHandlers(): void {
		if (!this._documentTarget)
			return;

		if (this._boundDocumentUp) {
			this._documentTarget.removeEventListener(this._documentUpEvent, this._boundDocumentUp, true);
			if (this._documentCancelEvent)
				this._documentTarget.removeEventListener(this._documentCancelEvent, this._boundDocumentUp, true);
		}

		if (this._boundDocumentMove)
			this._documentTarget.removeEventListener(this._documentMoveEvent, this._boundDocumentMove, true);
	}

	private extraTouchStart(e: TouchEvent): boolean | undefined {
		if (e.target === this._element || (this._outsidePointerHandler && this._outsidePointerHandler(e)))
			return cancelEvent(e);
	}

	private pointerDown(e: PointerEvent): boolean | undefined {
		if (this._pointerId >= 0 && e.pointerType !== "mouse")
			return cancelEvent(e);

		const ret = this.mouseDown(e);

		if (this._captured)
			this._pointerId = e.pointerId;

		return ret;
	}

	private pointerMove(e: PointerEvent): boolean | undefined {
		if (!this._captured || e.pointerId !== this._pointerId)
			return;

		return this.mouseMove(e);
	}

	private pointerUp(e: PointerEvent): boolean | undefined {
		if (!this._captured || e.pointerId !== this._pointerId)
			return;

		this._pointerId = -1;

		return this.mouseUp(e);
	}

	private touchStart(e: TouchEvent): boolean | undefined {
		if (e.touches.length > 1)
			return;

		if (this._pointerId >= 0)
			this.touchEnd(e);

		this._pointerId = 1;

		(e as any).clientX = e.touches[0].clientX;
		(e as any).clientY = e.touches[0].clientY;

		let ret = this.mouseDown(e as any);
		if (ret === undefined)
			this._pointerId = -1;

		return ret;
	}

	private touchMove(e: TouchEvent): boolean | undefined {
		if (!this._captured || e.touches.length > 1)
			return;

		(e as any).clientX = e.touches[0].clientX;
		(e as any).clientY = e.touches[0].clientY;

		return this.mouseMove(e as any);
	}

	private touchEnd(e: TouchEvent): boolean | undefined {
		if (!this._captured || this._pointerId < 0)
			return;

		this._pointerId = -1;

		return this.mouseUp(e as any);
	}

	private mouseDown(e: MouseEvent): boolean | undefined {
		this.mouseUp(e);

		if (e.button || (e.target && e.target !== this._element && (!this._outsidePointerHandler || !this._outsidePointerHandler(e))))
			return;

		if (this._downCallback && !this._downCallback(e))
			return cancelEvent(e);

		this._captured = true;

		if (("setPointerCapture" in this._element) && (e as any).pointerId >= 0)
			this._element.setPointerCapture((e as any).pointerId);

		if (this._lazy)
			this.addSecondaryHandlers();

		return cancelEvent(e);
	}

	private mouseMove(e: MouseEvent): boolean | undefined {
		if (!this._captured)
			return;

		if (this._moveCallback)
			this._moveCallback(e);

		return cancelEvent(e);
	}

	private mouseUp(e: MouseEvent): boolean | undefined {
		if (!this._captured)
			return;

		this._captured = false;
		if (this._lazy)
			this.removeSecondaryHandlers();

		if (this._upCallback)
			this._upCallback(e);

		return cancelEvent(e);
	}
}
