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

void* allocBuffer(size_t size) {
	return malloc(size);
}

void freeBuffer(void* ptr) {
	if (ptr)
		free(ptr);
}

typedef struct GraphicalFilterEditorStruct {
	double filterKernelBuffer[MaximumFilterLength];
	double tmp[MaximumFilterLength];
	int channelCurves[2][VisibleBinCount];
	int actualChannelCurve[VisibleBinCount];
	int visibleFrequencies[VisibleBinCount];
	int equivalentZones[EquivalentZoneCount];
	int equivalentZonesFrequencyCount[EquivalentZoneCount + 1];

	int filterLength, sampleRate, binCount;

	// Must be last member
	FFT4g fft4g;
} GraphicalFilterEditor;

double lerp(double x0, double y0, double x1, double y1, double x) {
	return ((x - x0) * (y1 - y0) / (x1 - x0)) + y0;
}

float lerpf(float x0, float y0, float x1, float y1, float x) {
	return ((x - x0) * (y1 - y0) / (x1 - x0)) + y0;
}

GraphicalFilterEditor* graphicalFilterEditorAlloc(int filterLength, int sampleRate) {
	const size_t size = sizeof(GraphicalFilterEditor) - sizeof(FFT4g) + fftSizeOf(MaximumFilterLength);
	GraphicalFilterEditor* editor = (GraphicalFilterEditor*)malloc(size);
	memset(editor, 0, size);

	fftInit(&(editor->fft4g), MaximumFilterLength);
	fftChangeN(&(editor->fft4g), filterLength);

	editor->filterLength = filterLength;
	editor->sampleRate = sampleRate;
	editor->binCount = (filterLength >> 1) + 1;

	const int freqSteps[] = { 5, 5, 5, 5, 10, 10, 20, 40, 80, 89};
	const int firstFreqs[] = { 5, 50, 95, 185, 360, 720, 1420, 2860, 5740, 11498 };
	const int equivalentZones[] = { 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 };
	const int equivalentZonesFrequencyCount[] = { 0, 9, 9 + 9, 18 + 9 + 9, 35 + 18 + 9 + 9, 36 + 35 + 18 + 9 + 9, 70 + 36 + 35 + 18 + 9 + 9, 72 + 70 + 36 + 35 + 18 + 9 + 9, 72 + 72 + 70 + 36 + 35 + 18 + 9 + 9, 72 + 72 + 72 + 70 + 36 + 35 + 18 + 9 + 9, VisibleBinCount };

	int i, s, f = firstFreqs[0];

	memcpy(editor->equivalentZones, equivalentZones, sizeof(int) * EquivalentZoneCount);
	memcpy(editor->equivalentZonesFrequencyCount, equivalentZonesFrequencyCount, sizeof(int) * (EquivalentZoneCount + 1));
	for (i = 0, s = 0; i < VisibleBinCount; i++) {
		editor->visibleFrequencies[i] = f;
		if (s != EquivalentZoneCount && (i + 1) >= equivalentZonesFrequencyCount[s + 1]) {
			s++;
			f = firstFreqs[s];
		} else {
			f += freqSteps[s];
		}
	}

	for (i = VisibleBinCount - 1; i >= 0; i--) {
		editor->channelCurves[0][i] = ZeroChannelValueY;
		editor->channelCurves[1][i] = ZeroChannelValueY;
		editor->actualChannelCurve[i] = ZeroChannelValueY;
	}

	return editor;
}

double* graphicalFilterEditorGetFilterKernelBuffer(GraphicalFilterEditor* editor) {
	return editor->filterKernelBuffer;
}

int* graphicalFilterEditorGetChannelCurve(GraphicalFilterEditor* editor, int channel) {
	return editor->channelCurves[channel];
}

int* graphicalFilterEditorGetActualChannelCurve(GraphicalFilterEditor* editor) {
	return editor->actualChannelCurve;
}

int* graphicalFilterEditorGetVisibleFrequencies(GraphicalFilterEditor* editor) {
	return editor->visibleFrequencies;
}

int* graphicalFilterEditorGetEquivalentZones(GraphicalFilterEditor* editor) {
	return editor->equivalentZones;
}

int* graphicalFilterEditorGetEquivalentZonesFrequencyCount(GraphicalFilterEditor* editor) {
	return editor->equivalentZonesFrequencyCount;
}

double yToMagnitude(int y) {
	// 40dB = 100
	// -40dB = 0.01
	// magnitude = 10 ^ (dB/20)
	// log a (x^p) = p * log a (x)
	// x^p = a ^ (p * log a (x))
	// 10^p = e ^ (p * log e (10))
	return ((y <= MaximumChannelValueY) ? 100 :
		((y > MinimumChannelValueY) ? 0 :
			// 2 = 40dB/20
			// 2.302585092994046 = LN10
			exp(lerp(MaximumChannelValueY, 2, MinimumChannelValueY, -2, (double)y) * 2.302585092994046)));
}

int magnitudeToY(double magnitude) {
	// 40dB = 100
	// -40dB = 0.01
	return ((magnitude >= 100.0) ? MaximumChannelValueY :
		((magnitude < 0.01) ? (ValidYRangeHeight + 1) :
			// 2.302585092994046 = LN10
			(int)round((ZeroChannelValueY - (ZeroChannelValueY * log(magnitude) / 2.302585092994046 * 0.5)) - 0.4)));
}

double applyWindowAndComputeActualMagnitudes(GraphicalFilterEditor* editor, const double* filter) {
	const int filterLength = editor->filterLength;
	const int M = (filterLength >> 1);
	const double PI2_M = 6.283185307179586476925286766559 / (double)M;

	double* const tmp = editor->tmp;

	int i;
	double ii, rval, ival, maxMag, mag;

	// It is not possible to know what kind of window the browser will use,
	// so make an assumption here... Blackman window!
	// ...at least it is the one I used, back in C++ times :)
	for (i = M; i >= 0; i--) {
		// Hanning window
		// tmp[i] = filter[i] * (0.5 - (0.5 * cos(PI2_M * (double)i)));
		// Hamming window
		// tmp[i] = filter[i] * (0.54 - (0.46 * cos(PI2_M * (double)i)));
		// Blackman window
		tmp[i] = filter[i] * (0.42 - (0.5 * cos(PI2_M * (double)i)) + (0.08 * cos(2.0 * PI2_M * (double)i)));
	}

	for (i = filterLength - 1; i > M; i--)
		tmp[i] = 0;

	// Calculate the spectrum
	fft(&(editor->fft4g), tmp);

	// Save Nyquist for later
	ii = tmp[1];
	maxMag = (tmp[0] > ii ? tmp[0] : ii);
	for (i = 2; i < filterLength; i += 2) {
		rval = tmp[i];
		ival = tmp[i + 1];
		mag = sqrt((rval * rval) + (ival * ival));
		tmp[i >> 1] = mag;
		if (mag > maxMag) maxMag = mag;
	}

	// Restore Nyquist in its new position
	tmp[M] = ii;

	return maxMag;
}

void graphicalFilterEditorUpdateFilter(GraphicalFilterEditor* editor, int channelIndex, int isNormalized) {
	const int filterLength = editor->filterLength;
	const int filterLength2 = (filterLength >> 1);
	const double bw = (double)editor->sampleRate / (double)filterLength;
	// M = filterLength2, so, M_HALF_PI_FFTLEN2 = (filterLength2 * 0.5 * Math.PI) / filterLength2
	const double M_HALF_PI_FFTLEN2 = 1.5707963267948966192313216916398;

	double* const filter = editor->filterKernelBuffer;
	double* const tmp = editor->tmp;
	const int* const curve = editor->channelCurves[channelIndex];
	const int* const visibleFrequencies = editor->visibleFrequencies;

	int i, ii, freq, avg, avgCount, repeat = (isNormalized ? 2 : 1);
	double k, mag, invMaxMag = 1.0;

	// Fill in all filter points, either averaging or interpolating them as necessary
	do {
		repeat--;
		i = 1;
		ii = 0;
		for (; ;) {
			freq = (int)(bw * (double)i);
			if (freq >= visibleFrequencies[0]) break;
			mag = yToMagnitude(curve[0]);
			filter[i << 1] = mag * invMaxMag;
			i++;
		}

		while (bw > (double)(visibleFrequencies[ii + 1] - visibleFrequencies[ii]) && i < filterLength2 && ii < (VisibleBinCount - 1)) {
			freq = (int)(bw * (double)i);
			avg = 0;
			avgCount = 0;
			do {
				avg += curve[ii];
				avgCount++;
				ii++;
			} while (freq > visibleFrequencies[ii] && ii < (VisibleBinCount - 1));
			mag = yToMagnitude(avg / avgCount);
			filter[i << 1] = mag * invMaxMag;
			i++;
		}

		for (; i < filterLength2; i++) {
			freq = (int)(bw * (double)i);
			if (freq >= visibleFrequencies[VisibleBinCount - 1]) {
				mag = yToMagnitude(curve[VisibleBinCount - 1]);
			} else {
				while (ii < (VisibleBinCount - 1) && freq > visibleFrequencies[ii + 1])
					ii++;
				mag = yToMagnitude((int)lerp((double)visibleFrequencies[ii], (double)curve[ii], (double)visibleFrequencies[ii + 1], (double)curve[ii + 1], (double)freq));
			}
			filter[i << 1] = mag * invMaxMag;
		}

		// Since DC and Nyquist are purely real, do not bother with them in the for loop,
		// just make sure neither one has a gain greater than 0 dB
		filter[0] = (filter[2] >= 1.0 ? 1.0 : filter[2]);
		filter[1] = (filter[filterLength - 2] >= 1.0 ? 1.0 : filter[filterLength - 2]);

		// Convert the coordinates from polar to rectangular
		for (i = filterLength - 2; i >= 2; i -= 2) {
			//               -k.j
			// polar = Mag . e
			//
			// Where:
			// k = (M / 2) * pi * i / (fft length / 2)
			// i = index varying from 0 to (fft length / 2)
			//
			// rectangular:
			// real = Mag . cos(-k)
			// imag = Mag . sin(-k)
			k = M_HALF_PI_FFTLEN2 * (double)(i >> 1);
			// **** NOTE:
			// When using FFT4g, FFTReal or FFTNR, k MUST BE passed as the argument of sin and cos, due to the
			// signal of the imaginary component
			// RFFT, intel and other fft's use the opposite signal... therefore, -k MUST BE passed!!
			filter[i + 1] = (filter[i] * sin(k));
			filter[i] *= cos(k);
		}

		ffti(&(editor->fft4g), filter);

		if (repeat) {
			// Get the actual filter response, and then, compensate
			invMaxMag = applyWindowAndComputeActualMagnitudes(editor, filter);
			if (invMaxMag <= 0.0) repeat = 0;
			invMaxMag = 1.0 / invMaxMag;
		}
	} while (repeat);

	// AudioContext uses floats, not doubles...
	float* const filterf = (float*)filter;
	for (int i = 0; i < filterLength; i++)
		filterf[i] = (float)filter[i];
}

void graphicalFilterEditorUpdateActualChannelCurve(GraphicalFilterEditor* editor, int channelIndex) {
	const int filterLength = editor->filterLength;
	const int filterLength2 = (filterLength >> 1);
	const double bw = (double)editor->sampleRate / (double)filterLength;
	// M = filterLength2, so, M_HALF_PI_FFTLEN2 = (filterLength2 * 0.5 * Math.PI) / filterLength2
	const double M_HALF_PI_FFTLEN2 = 1.5707963267948966192313216916398;

	double* const filter = editor->filterKernelBuffer;
	double* const tmp = editor->tmp;
	int* const curve = editor->actualChannelCurve;
	const int* const visibleFrequencies = editor->visibleFrequencies;

	int i, ii, avgCount;
	double avg, freq;

	// AudioContext uses floats, not doubles...
	float* const filterf = (float*)filter;
	for (int i = filterLength - 1; i >= 0; i--)
		filter[i] = (double)filterf[i];

	applyWindowAndComputeActualMagnitudes(editor, filter);

	// tmp now contains (filterLength2 + 1) magnitudes
	i = 0;
	ii = 0;
	while (ii < (VisibleBinCount - 1) && i < filterLength2 && bw > (double)(visibleFrequencies[ii + 1] - visibleFrequencies[ii])) {
		freq = bw * (double)i;
		while (i < filterLength2 && (int)(freq + bw) < visibleFrequencies[ii]) {
			i++;
			freq = bw * (double)i;
		}
		curve[ii] = magnitudeToY(lerp(freq, tmp[i], freq + bw, tmp[i + 1], (double)visibleFrequencies[ii]));
		ii++;
	}

	i++;
	while (i < filterLength2 && ii < VisibleBinCount) {
		avg = 0.0;
		avgCount = 0;
		do {
			avg += tmp[i];
			avgCount++;
			i++;
			freq = bw * (double)i;
		} while ((int)freq < visibleFrequencies[ii] && i < filterLength2);
		curve[ii] = magnitudeToY(avg / (double)avgCount);
		ii++;
	}

	i = (((editor->sampleRate >> 1) >= visibleFrequencies[VisibleBinCount - 1]) ? curve[ii - 1] : (ValidYRangeHeight + 1));

	for (; ii < VisibleBinCount; ii++)
		curve[ii] = i;
}

void graphicalFilterEditorChangeFilterLength(GraphicalFilterEditor* editor, int newFilterLength) {
	editor->filterLength = newFilterLength;
	fftChangeN(&(editor->fft4g), newFilterLength);
}

void graphicalFilterEditorFree(GraphicalFilterEditor* editor) {
	if (editor)
		free(editor);
}
