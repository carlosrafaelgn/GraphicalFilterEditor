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

#include "common.h"

typedef struct FFT4gStruct {
	int n, maxN;
	// According to the spec: length of ip >= 2+sqrt(n/2)
	// Since MaximumFilterLength = 8192, length of ip >= 2+sqrt(8192/2) = 66
	int ip[70];
	// 70 + 2 = 72
	// 72 * 4 bytes = 288 bytes = 100100000 (w is aligned in a 32-byte boundary)
	double w[0];
} FFT4g;

typedef struct FFT4gfStruct {
	int n, maxN;
	// According to the spec: length of ip >= 2+sqrt(n/2)
	// Since MaximumFilterLength = 8192, length of ip >= 2+sqrt(8192/2) = 66
	int ip[70];
	// 70 + 2 = 72
	// 72 * 4 bytes = 288 bytes = 100100000 (w is aligned in a 32-byte boundary)
	float w[0];
} FFT4gf;

extern size_t fftSizeOf(int n);
extern FFT4g* fftInit(FFT4g* fft4g, int n);
extern FFT4g* fftAlloc(int n);
extern void fftFree(FFT4g* fft4g);
extern void fftChangeN(FFT4g* fft4g, int n);

extern size_t fftSizeOff(int n);
extern FFT4gf* fftInitf(FFT4gf* fft4gf, int n);
extern FFT4gf* fftAllocf(int n);
extern void fftFreef(FFT4gf* fft4gf);
extern void fftChangeNf(FFT4gf* fft4gf, int n);

// Ordering of data
// time [0]          | Real [bin 0]
// time [1]          | Real [bin n / 2]
// time [2]          | Real [bin 1]
// time [3]          | Imag [bin 1]
// time [...]        | Real [bin ...]
// time [...]        | Imag [bin ...]
// time [n - 2]      | Real [bin (n / 2) - 1]
// time [n - 1]      | Imag [bin (n / 2) - 1]

extern void fft(FFT4g* fft4g, double* data);
extern void ffti(FFT4g* fft4g, double* data);
extern void fftf(FFT4gf* fft4gf, float* data);
extern void fftif(FFT4gf* fft4gf, float* data);
