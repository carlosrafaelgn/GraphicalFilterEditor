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
#include "fft4g.h"

void plainAnalyzer(FFT4gf* fft4gf, const float* window, const unsigned char* data, float* tmp) {
	for (int i = 0; i < 1024; i++)
		tmp[i] = window[i] * (float)(((int)data[i]) - 128);

	memset(tmp + 1024, 0, 1024 * sizeof(float));

	fftf(fft4gf, tmp);

	// DC and Nyquist bins are being ignored
	tmp[0] = 0;
	tmp[1] = 0;
	for (int i = 2; i < 2048; i += 2) {
		// 0.0009765625 = 1 / (2048/2)
		const float d = tmp[i] * 0.0009765625f; // re
		const float im = tmp[i + 1] * 0.0009765625f; // im
		tmp[i >> 1] = logf(sqrtf((d * d) + (im * im)) + 0.2f);
	}
}
