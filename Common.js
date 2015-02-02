//
// GraphicalFilterEditor is distributed under the FreeBSD License
//
// Copyright (c) 2012-2015, Carlos Rafael Gimenes das Neves
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
// ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// The views and conclusions contained in the software and documentation are those
// of the authors and should not be interpreted as representing official policies,
// either expressed or implied, of the FreeBSD Project.
//
// https://github.com/carlosrafaelgn/GraphicalFilterEditor
//
"use strict";

//Miscellaneous functions
window._isTouch = (("ontouchend" in document) ? true : false);
function seal$(x) {
	if (Object.seal) Object.seal(x);
	return x;
}
function freeze$(x) {
	if (Object.freeze) Object.freeze(x);
	return x;
}
function $(e) {
	return document.getElementById(e);
}
function cancelEvent(e) {
	if ("isCancelled" in e)
		e.isCancelled = true;
	if ("preventDefault" in e)
		e.preventDefault();
	if ("stopPropagation" in e)
		e.stopPropagation();
	return false;
}
function leftTop(element) {
	var left, top;
	if (element.getBoundingClientRect) {
		left = element.getBoundingClientRect();
		top = left.top + window.pageYOffset;
		left = left.left + window.pageXOffset;
	} else {
		left = 0;
		top = 0;
		while (element) {
			left += element.offsetLeft;
			top += element.offsetTop;
			element = element.offsetParent;
		}
	}
	return [left, top];
}
window.touchMouse = (_isTouch ? {
	_cloneEvent: function (e, cx, cy, px, py) {
		var c = { button: 0, target: e.target, eventPhase: e.eventPhase, clientX: cx, clientY: cy, pageX: px, pageY: py, isCancelled: false };
		if (e.preventDefault) c.preventDefault = function () { return e.preventDefault(); };
		if (e.stopPropagation) c.stopPropagation = function () { return e.stopPropagation(); };
		return c;
	},
	_touchstartc: function (e) {
		return touchMouse.touchstart(this, "_tc", e);
	},
	_touchstart: function (e) {
		return touchMouse.touchstart(this, "_t", e);
	},
	touchstart: function (t, p, e) {
		if (e.touches.length > 1) return;
		if (t._tstate) touchMouse.touchend(t, p, e);
		t._tstate = true;
		var i, l, c = touchMouse._cloneEvent(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.changedTouches[0].pageX, e.changedTouches[0].pageY);
		l = t[p + "mouseover"];
		if (l) {
			for (i = l.length - 1; i >= 0; i--)
				l[i].call(t, c);
		}
		l = t[p + "mousedown"];
		if (l) {
			for (i = l.length - 1; i >= 0; i--)
				l[i].call(t, c);
		}
		return !c.isCancelled;
	},
	_touchmovec: function (e) {
		return touchMouse.touchmove(this, "_tc", e);
	},
	_touchmove: function (e) {
		return touchMouse.touchmove(this, "_t", e);
	},
	touchmove: function (t, p, e) {
		if (e.touches.length > 1) return;
		var i, l = t[p + "mousemove"], c = touchMouse._cloneEvent(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.changedTouches[0].pageX, e.changedTouches[0].pageY);
		if (l) {
			for (i = l.length - 1; i >= 0; i--)
				l[i].call(t, c);
		}
		return !c.isCancelled;
	},
	_touchendc: function (e) {
		return touchMouse.touchend(this, "_tc", e);
	},
	_touchend: function (e) {
		return touchMouse.touchend(this, "_t", e);
	},
	touchend: function (t, p, e) {
		t._tstate = false;
		var i, l, c = ((e.changedTouches && e.changedTouches.length >= 1) ? touchMouse._cloneEvent(e, e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.changedTouches[0].pageX, e.changedTouches[0].pageY) : touchMouse._cloneEvent(e, 0, 0, 0, 0));
		l = t[p + "mouseup"];
		if (l) {
			for (i = l.length - 1; i >= 0; i--)
				l[i].call(t, c);
		}
		l = t[p + "mouseout"];
		if (l) {
			for (i = l.length - 1; i >= 0; i--)
				l[i].call(t, c);
		}
		return !c.isCancelled;
	}
} : undefined);
window.attachMouse = (_isTouch ? function (observable, eventName, targetFunction, capturePhase) {
	var e;
	if (eventName === "click") {
		observable.addEventListener(eventName, targetFunction, capturePhase);
	} else if (eventName === "mousemove") {
		e = (capturePhase ? "_tc" : "_t") + eventName;
		if (!observable[e]) {
			observable[e] = [targetFunction];
			observable.addEventListener("touchmove", capturePhase ? touchMouse._touchmovec : touchMouse._touchmove, capturePhase);
		} else {
			observable[e].push(targetFunction);
		}
	} else {
		e = (capturePhase ? "_tc" : "_t");
		if (!observable[e]) {
			observable[e] = 1;
			observable.addEventListener("touchstart", capturePhase ? touchMouse._touchstartc : touchMouse._touchstart, capturePhase);
			observable.addEventListener("touchend", capturePhase ? touchMouse._touchendc : touchMouse._touchend, capturePhase);
			observable.addEventListener("touchcancel", capturePhase ? touchMouse._touchendc : touchMouse._touchend, capturePhase);
		} else {
			observable[e]++;
		}
		e += eventName;
		if (!observable[e]) {
			observable[e] = [targetFunction];
		} else {
			observable[e].push(targetFunction);
		}
	}
	return true;
} : function (observable, eventName, targetFunction, capturePhase) {
	return observable.addEventListener(eventName, targetFunction, capturePhase);
});
window.detachMouse = (_isTouch ? function (observable, eventName, targetFunction, capturePhase) {
	var i, l, p, e;
	if (eventName === "click") {
		observable.removeEventListener(eventName, targetFunction, capturePhase);
	} else if (eventName === "mousemove") {
		e = (capturePhase ? "_tc" : "_t") + eventName;
		l = observable[e];
		if (l) {
			for (i = l.length - 1; i >= 0; i--) {
				if (l[i] === targetFunction) {
					if (l.length === 1) {
						delete observable[e];
						observable.removeEventListener("touchmove", capturePhase ? touchMouse._touchmovec : touchMouse._touchmove, capturePhase);
					} else {
						l.splice(i, 1);
					}
					break;
				}
			}
		}
	} else {
		p = (capturePhase ? "_tc" : "_t");
		e = p + eventName;
		i = -1;
		l = observable[e];
		if (l) {
			for (i = l.length - 1; i >= 0; i--) {
				if (l[i] === targetFunction) {
					if (l.length === 1) {
						delete observable[e];
					} else {
						l.splice(i, 1);
					}
					break;
				}
			}
		}
		if (i >= 0) {
			if (observable[p] > 1) {
				observable[p]--;
			} else {
				delete observable[p];
				observable.removeEventListener("touchstart", capturePhase ? touchMouse._touchstartc : touchMouse._touchstart, capturePhase);
				observable.removeEventListener("touchend", capturePhase ? touchMouse._touchendc : touchMouse._touchend, capturePhase);
				observable.removeEventListener("touchcancel", capturePhase ? touchMouse._touchendc : touchMouse._touchend, capturePhase);
			}
		}
	}
	return true;
} : function (observable, eventName, targetFunction, capturePhase) {
	return observable.removeEventListener(eventName, targetFunction, capturePhase ? true : false);
});
