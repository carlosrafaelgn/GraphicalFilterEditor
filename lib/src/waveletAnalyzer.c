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

#include <emscripten.h>
#include <stdlib.h>
#include <memory.h>
#include <math.h>

void haar(float* x, int n, float* tmp) {
	// input:
	// original time / previous lo pass data
	// output:
	// scaling = lo pass = 1st half
	// wl coeff = hi pass = 2nd half
	// 0.70710678118654752440084436210485 = sqrt(2) / 2

	const int n2 = n >> 1;

	for (int i = 0; i < n; i += 2) {
		const float xi = x[i];
		const float xi1 = x[i + 1];
		x[i >> 1] = (xi + xi1) * 0.70710678118654752440084436210485f;
		tmp[i >> 1] = (xi - xi1) * 0.70710678118654752440084436210485f;
	}

	for (int i = n2; i < n; i++)
		x[i] = tmp[i - n2];
}

void waveletAnalyzer(const unsigned char* dataL, const unsigned char* dataR, float* tmp, float* oL1, float* oR1) {
	int i;

	for (int i = 0; i < 128; i++)
		oL1[i] = (float)(((int)dataL[i]) - 128) * 4;
	i = 128;
	while (i >= 4) {
		haar(oL1, i, tmp);
		i >>= 1;
	}

	for (int i = 0; i < 128; i++)
		oR1[i] = (float)(((int)dataR[i]) - 128) * 4;
	i = 128;
	while (i >= 4) {
		haar(oR1, i, tmp);
		i >>= 1;
	}
}
