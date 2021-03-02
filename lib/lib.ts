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

interface CLib {
	HEAP8: Uint8Array;
	HEAPF32: Float32Array;

	stackSave(): number;
	stackAlloc(size: number): number;
	stackRestore(stackPtr: number): void;

	_allocBuffer(size: number): number;
	_freeBuffer(ptr: number): void;

	_fftSizeOf(n: number): number;
	_fftInit(fft4gPtr: number, n: number): number;
	_fftAlloc(n: number): number;
	_fftFree(fft4gPtr: number): void;
	_fft(fft4gPtr: number, dataPtr: number): void;
	_ffti(fft4gPtr: number, dataPtr: number): void;

	_fftSizeOff(n: number): number;
	_fftInitf(fft4gfPtr: number, n: number): number;
	_fftAllocf(n: number): number;
	_fftFreef(fft4gfPtr: number): void;
	_fftf(fft4gfPtr: number, dataPtr: number): void;
	_fftif(fft4gfPtr: number, dataPtr: number): void;

	_graphicalFilterEditorAlloc(filterLength: number, sampleRate: number): number;
	_graphicalFilterEditorGetFilterKernelBuffer(editorPtr: number): number;
	_graphicalFilterEditorGetChannelCurve(editorPtr: number, channel: number): number;
	_graphicalFilterEditorGetActualChannelCurve(editorPtr: number): number;
	_graphicalFilterEditorGetVisibleFrequencies(editorPtr: number): number;
	_graphicalFilterEditorGetEquivalentZones(editorPtr: number): number;
	_graphicalFilterEditorGetEquivalentZonesFrequencyCount(editorPtr: number): number;
	_graphicalFilterEditorUpdateFilter(editorPtr: number, channelIndex: number, isNormalized: boolean): void;
	_graphicalFilterEditorUpdateActualChannelCurve(editorPtr: number, channelIndex: number): void;
	_graphicalFilterEditorChangeFilterLength(editorPtr: number, newFilterLength: number): void;
	_graphicalFilterEditorFree(editorPtr: number): void;

	_plainAnalyzer(fft4gfPtr: number, windowPtr: number, dataPtr: number, tmpPtr: number): void;
	_waveletAnalyzer(dataLPtr: number, dataRPtr: number, tmpPtr: number, oL1Ptr: number, oR1Ptr: number): void;
}
