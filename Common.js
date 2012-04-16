//
// Common.js is distributed under the FreeBSD License
//
// Copyright (c) 2012, Carlos Rafael Gimenes das Neves
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
// https://github.com/carlosrafaelgn/GraphicalFilterEditor/blob/master/Common.js
//
"use strict";

//Miscellaneous functions
function seal$(x) {
	if (Object.seal) Object.seal(x);
	return x;
}
function freeze$(x) {
	if (Object.freeze) Object.freeze(x);
	return x;
}
function $(e) {
	if (typeof (e) === "string")
		return document.getElementById(e);
	return e;
}
function cancelEvent(e) {
	if (e.stopPropagation)
		e.stopPropagation();
	if (e.preventDefault)
		e.preventDefault();
	if (e.cancelBubble !== undefined)
		e.cancelBubble = true;
	if (e.cancel !== undefined)
		e.cancel = true;
	if (e.returnValue !== undefined)
		e.returnValue = false;
	return false;
}
function getElementLeftTop(element) {
	var left = 0,
	top = 0;
	while (element) {
		left += element.offsetLeft;
		top += element.offsetTop;
		element = element.offsetParent;
	}
	return [left, top];
}
