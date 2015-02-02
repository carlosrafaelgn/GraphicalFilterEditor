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

function uint32ToArray(array, startIndex, value) {
	array[startIndex] = value;
	array[startIndex + 1] = (value >>> 8);
	array[startIndex + 2] = (value >>> 16);
	array[startIndex + 3] = (value >>> 24);
}
function uint16ToArray(array, startIndex, value) {
	array[startIndex] = value;
	array[startIndex + 1] = (value >>> 8);
}
onmessage = function (e) {
	var i, d, s, hdrData, dstData, blockAlign, byteLength,
		left = new Float32Array(e.data.left),
		right = e.data.right,
		length = e.data.length, channelCount;
	if (right) {
		channelCount = 2;
		right = new Float32Array(right);
		dstData = new Uint8Array(length << 2);
		for (i = length - 1, d = i << 2; i >= 0; i--, d -= 4) {
			//Interleave left and right channels before saving the WAVE file
			//convert the output into an array of 16 bit samples (little endian)
			s = (left[i] * 0x7FFF) | 0;
			if (s > 0x7FFF) s = 0x7FFF;
			else if (s < -0x8000) s = -0x8000;
			uint16ToArray(dstData, d, s);

			s = (right[i] * 0x7FFF) | 0;
			if (s > 0x7FFF) s = 0x7FFF;
			else if (s < -0x8000) s = -0x8000;
			uint16ToArray(dstData, d + 2, s);
		}
	} else {
		channelCount = 1;
		dstData = new Uint8Array(length << 1);
		for (i = length - 1, d = i << 1; i >= 0; i--, d -= 2) {
			//Convert the output into an array of 16 bit samples (little endian)
			s = (left[i] * 0x7FFF) | 0;
			if (s > 0x7FFF) s = 0x7FFF;
			else if (s < -0x8000) s = -0x8000;
			uint16ToArray(dstData, d, s);
		}
	}
	//Generate the WAVE file header
	blockAlign = channelCount << 1; //16 bit samples (2 bytes per channel)
	byteLength = length * blockAlign;
	hdrData = new Uint8Array(44);
	uint32ToArray(hdrData, 0, 0x46464952); //"RIFF"
	uint32ToArray(hdrData, 4, byteLength + 36); //chunk size
	uint32ToArray(hdrData, 8, 0x45564157); //"WAVE"
	uint32ToArray(hdrData, 12, 0x20746d66); //"fmt "
	uint32ToArray(hdrData, 16, 16); //PCM header size
	uint16ToArray(hdrData, 20, 1); //audio format (PCM = 1)
	uint16ToArray(hdrData, 22, channelCount);
	uint32ToArray(hdrData, 24, e.data.sampleRate);
	uint32ToArray(hdrData, 28, e.data.sampleRate * blockAlign);
	uint16ToArray(hdrData, 32, blockAlign);
	uint16ToArray(hdrData, 34, 16); //bits per samples
	uint32ToArray(hdrData, 36, 0x61746164); //"data"
	uint32ToArray(hdrData, 40, byteLength);
	postMessage([hdrData.buffer, dstData.buffer], [hdrData.buffer, dstData.buffer]);
	return true;
};
