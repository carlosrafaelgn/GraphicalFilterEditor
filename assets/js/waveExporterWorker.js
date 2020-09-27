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
	let i, d, s, hdrData, dstData, blockAlign, byteLength,
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
