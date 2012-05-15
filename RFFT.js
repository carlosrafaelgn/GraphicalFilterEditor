//
// Note: I have made a few changes to this file, such as deleting
// most of the functions I would not use, reorganizing the rest of the functions,
// renaming the file, adding use strict, implementing the inverse transform...
//
// https://github.com/carlosrafaelgn/GraphicalFilterEditor/blob/master/RFFT.js
//

/*
*  DSP.js - a comprehensive digital signal processing  library for javascript
*
*  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
*  Copyright 2010 Corban Brook. All rights reserved.
*
*/

/*
* RFFT is a class for calculating the Discrete Fourier Transform of a
* signal with the Fast Fourier Transform algorithm.
*
* It is based on the file https://raw.github.com/corbanbrook/dsp.js,
* with a few modifications, including the rest of the translation of
* the C++ code in the FXT library, by Joerg Arndt. The original
* functions are split_radix_real_complex_fft and
* split_radix_complex_real_fft, found in the file
* fxt\src\realfft\realfftsplitradix.cc
*
*/

/**
* RFFT is a class for calculating the Discrete Fourier Transform of a signal
* with the Fast Fourier Transform algorithm.
*
* This method currently only contains a forward transform but is highly optimized.
*
* @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
* @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
*
* @constructor
*/

// lookup tables don't really gain us any speed, but they do increase
// cache footprint, so don't use them in here

// also we don't use sepearate arrays for real/imaginary parts

// this one a little more than twice as fast as the one in FFT
// however I only did the forward transform

// the rest of this was translated from C, see http://www.jjj.de/fxt/
// this is the real split radix FFT

"use strict";

function RFFT(bufferSize, sampleRate) {
	this.bufferSize = bufferSize;
	this.invBufferSize = 1 / bufferSize;
	this.sampleRate = sampleRate;
	this.bandwidth = sampleRate / bufferSize;
	this.trans = new Float32Array(bufferSize);
	this.spectrum = null;
	seal$(this);
}
RFFT.prototype = {
	changeSampleRate: function (newSampleRate) {
		this.sampleRate = newSampleRate;
		this.bandwidth = newSampleRate / this.bufferSize;
		return newSampleRate;
	},
	// don't use a lookup table to do the permute, use this instead
	reverseBinPermute: function (dest, source, mult) {
		var bufferSize = this.bufferSize,
			halfSize = bufferSize >>> 1,
			nm1 = bufferSize - 1,
			i = 1, r = 0, h;
		if (mult) {
			dest[0] = mult * source[0];
			do {
				r += halfSize;
				dest[i] = mult * source[r];
				dest[r] = mult * source[i];
				i++;
				h = halfSize << 1;
				while ((h = h >> 1) && !((r ^= h) & h));
				if (r >= i) {
					dest[i] = mult * source[r];
					dest[r] = mult * source[i];
					dest[nm1 - i] = mult * source[nm1 - r];
					dest[nm1 - r] = mult * source[nm1 - i];
				}
				i++;
			} while (i < halfSize);
			dest[nm1] = mult * source[nm1];
		} else {
			dest[0] = source[0];
			do {
				r += halfSize;
				dest[i] = source[r];
				dest[r] = source[i];
				i++;
				h = halfSize << 1;
				while ((h = h >> 1) && !((r ^= h) & h));
				if (r >= i) {
					dest[i] = source[r];
					dest[r] = source[i];
					dest[nm1 - i] = source[nm1 - r];
					dest[nm1 - r] = source[nm1 - i];
				}
				i++;
			} while (i < halfSize);
			dest[nm1] = source[nm1];
		}
		return dest;
	},
	generateReverseTable: function () {
		var bufferSize = this.bufferSize,
			halfSize = bufferSize >>> 1,
			nm1 = bufferSize - 1,
			i = 1, r = 0, h;
		this.reverseTable = new Int32Array(bufferSize);
		this.reverseTable[0] = 0;
		do {
			r += halfSize;
			this.reverseTable[i] = r;
			this.reverseTable[r] = i;
			i++;
			h = halfSize << 1;
			while (h = h >> 1, !((r ^= h) & h));
			if (r >= i) {
				this.reverseTable[i] = r;
				this.reverseTable[r] = i;
				this.reverseTable[nm1 - i] = nm1 - r;
				this.reverseTable[nm1 - r] = nm1 - i;
			}
			i++;
		} while (i < halfSize);
		this.reverseTable[nm1] = nm1;
		return this.reverseTable;
	},
	getBandFrequency: function (index) {
		return this.bandwidth * index + this.bandwidth * 0.5;
	},
	calculateSpectrum: function (outputBuffer) {
		var x = this.trans,
			spectrum = (outputBuffer ? outputBuffer : this.spectrum),
			sqrt = Math.sqrt, rval, ival, i, bufferSize = this.bufferSize, bufferSize2 = (bufferSize >>> 1);
		if (!spectrum) {
			spectrum = new Float32Array(bufferSize2 + 1);
			this.spectrum = spectrum;
		}
		spectrum[0] = x[0]; //I'm not so sure about this... Shouldn't it be multiplied by 0.5... I don't remember the rules very well
		for (i = 1; i < bufferSize2; i++) {
			rval = x[i];
			ival = x[bufferSize - i];
			spectrum[i] = sqrt((rval * rval) + (ival * ival));
		}
		spectrum[i] = x[i]; //again, not so sure about this...
		return true;
	},
	// Ordering of output:
	//
	// trans[0]     = re[0] (==zero frequency, purely real)
	// trans[1]     = re[1]
	//             ...
	// trans[n/2-1] = re[n/2-1]
	// trans[n/2]   = re[n/2]    (==nyquist frequency, purely real)
	//
	// trans[n/2+1] = im[n/2-1]
	// trans[n/2+2] = im[n/2-2]
	//             ...
	// trans[n-1]   = im[1] 
	//
	// Corresponding real and imag parts (with the exception of
	// zero and nyquist freq) are found in trans[i] and trans[n-i]
	forward: function (inputBuffer) {
		var n = this.bufferSize,
			x = this.trans,
			TWO_PI = 2 * Math.PI,
			SQRT1_2 = Math.SQRT1_2,
			n2, n4, n8, nn,
			t1, t2, t3, t4,
			j, ix, id, i0, i1, i2, i3, i4, i5, i6, i7, i8,
			cc1, ss1, cc3, ss3,
			sin = Math.sin,
			cos = Math.cos,
			e, a;
		RFFT.prototype.reverseBinPermute.apply(this, [x, inputBuffer]);
		for (ix = 0, id = 4; ix < n; id <<= 2) {
			for (i0 = ix; i0 < n; i0 += id) {
				//sumdiff(x[i0], x[i0+1]); // {a, b}  <--| {a+b, a-b}
				a = x[i0] - x[i0 + 1];
				x[i0] += x[i0 + 1];
				x[i0 + 1] = a;
			}
			ix = (id - 1) << 1;
		}
		n2 = 2;
		nn = n >>> 1;
		while ((nn >>>= 1)) {
			ix = 0;
			n2 = n2 << 1;
			id = n2 << 1;
			n4 = n2 >>> 2;
			n8 = n2 >>> 3;
			do {
				if (n4 !== 1) {
					for (i0 = ix; i0 < n; i0 += id) {
						i1 = i0;
						i2 = i1 + n4;
						i3 = i2 + n4;
						i4 = i3 + n4;
						//diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
						t1 = x[i3] + x[i4];
						x[i4] -= x[i3];
						//sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
						x[i3] = x[i1] - t1;
						x[i1] += t1;
						i1 += n8;
						i2 += n8;
						i3 += n8;
						i4 += n8;
						//sumdiff(x[i3], x[i4], t1, t2); // {s, d}  <--| {a+b, a-b}
						t1 = x[i3] + x[i4];
						t2 = x[i3] - x[i4];
						t1 *= -SQRT1_2;
						t2 *= SQRT1_2;
						//sumdiff(t1, x[i2], x[i4], x[i3]); // {s, d}  <--| {a+b, a-b}
						a = x[i2];
						x[i4] = t1 + a;
						x[i3] = t1 - a;
						//sumdiff3(x[i1], t2, x[i2]); // {a, b, d} <--| {a+b, b, a-b}
						x[i2] = x[i1] - t2;
						x[i1] += t2;
					}
				} else {
					for (i0 = ix; i0 < n; i0 += id) {
						i1 = i0;
						i2 = i1 + n4;
						i3 = i2 + n4;
						i4 = i3 + n4;
						//diffsum3_r(x[i3], x[i4], t1); // {a, b, s} <--| {a, b-a, a+b}
						t1 = x[i3] + x[i4];
						x[i4] -= x[i3];
						//sumdiff3(x[i1], t1, x[i3]);   // {a, b, d} <--| {a+b, b, a-b}
						x[i3] = x[i1] - t1;
						x[i1] += t1;
					}
				}
				ix = (id << 1) - n2;
				id = id << 2;
			} while (ix < n);
			e = TWO_PI / n2;
			for (j = 1; j < n8; j++) {
				a = j * e;
				ss1 = sin(a);
				cc1 = cos(a);
				//ss3 = sin(3*a); cc3 = cos(3*a);
				cc3 = 4 * cc1 * (cc1 * cc1 - 0.75);
				ss3 = 4 * ss1 * (0.75 - ss1 * ss1);
				ix = 0;
				id = n2 << 1;
				do {
					for (i0 = ix; i0 < n; i0 += id) {
						i1 = i0 + j;
						i2 = i1 + n4;
						i3 = i2 + n4;
						i4 = i3 + n4;
						i5 = i0 + n4 - j;
						i6 = i5 + n4;
						i7 = i6 + n4;
						i8 = i7 + n4;
						//cmult(c, s, x, y, &u, &v)
						//cmult(cc1, ss1, x[i7], x[i3], t2, t1); // {u,v} <--| {x*c-y*s, x*s+y*c}
						t2 = x[i7] * cc1 - x[i3] * ss1;
						t1 = x[i7] * ss1 + x[i3] * cc1;
						//cmult(cc3, ss3, x[i8], x[i4], t4, t3);
						t4 = x[i8] * cc3 - x[i4] * ss3;
						t3 = x[i8] * ss3 + x[i4] * cc3;
						//sumdiff(t2, t4); // {a, b} <--| {a+b, a-b}
						a = t2 - t4;
						t2 += t4;
						t4 = a;
						//sumdiff(t2, x[i6], x[i8], x[i3]); // {s, d}  <--| {a+b, a-b}
						//st1 = x[i6]; x[i8] = t2 + st1; x[i3] = t2 - st1;
						x[i8] = t2 + x[i6];
						x[i3] = t2 - x[i6];
						//sumdiff_r(t1, t3); // {a, b} <--| {a+b, b-a}
						a = t3 - t1;
						t1 += t3;
						t3 = a;
						//sumdiff(t3, x[i2], x[i4], x[i7]); // {s, d}  <--| {a+b, a-b}
						//st1 = x[i2]; x[i4] = t3 + st1; x[i7] = t3 - st1;
						x[i4] = t3 + x[i2];
						x[i7] = t3 - x[i2];
						//sumdiff3(x[i1], t1, x[i6]); // {a, b, d} <--| {a+b, b, a-b}
						x[i6] = x[i1] - t1;
						x[i1] += t1;
						//diffsum3_r(t4, x[i5], x[i2]); // {a, b, s} <--| {a, b-a, a+b}
						x[i2] = t4 + x[i5];
						x[i5] -= t4;
					}
					ix = (id << 1) - n2;
					id = id << 2;
				} while (ix < n);
			}
		}
		return x;
	},
	inverse: function (outputBuffer) {
		var n = this.bufferSize,
			x = this.trans,
			TWO_PI = 2 * Math.PI,
			SQRT2 = Math.SQRT2,
			n2 = n << 1, n4, n8, nn = n >>> 1,
			t1, t2, t3, t4,
			j, ix, id, i0, i1, i2, i3, i4, i5, i6, i7, i8,
			cc1, ss1, cc3, ss3,
			sin = Math.sin,
			cos = Math.cos,
			e, a;
		while ((nn >>>= 1)) {
			ix = 0;
			id = n2;
			n2 >>>= 1;
			n4 = n2 >>> 2;
			n8 = n4 >>> 1;
			do { // ix
				for (i0 = ix; i0 < n; i0 += id) {
					i1 = i0;
					i2 = i1 + n4;
					i3 = i2 + n4;
					i4 = i3 + n4;
					//sumdiff3(x[i1], x[i3], t1); // {a, b, d} <--| {a+b, b, a-b}
					t1 = x[i1] - x[i3];
					x[i1] += x[i3];
					x[i2] += x[i2];
					x[i4] += x[i4];
					//sumdiff3_r(x[i4], t1, x[i3]); // {a, b, d} <--| {a+b, b, b-a}
					x[i3] = t1 - x[i4];
					x[i4] += t1;
					if (n4 !== 1) {
						i1 += n8;
						i2 += n8;
						i3 += n8;
						i4 += n8;
						//sumdiff3(x[i1], x[i2], t1); // {a, b, d} <--| {a+b, b, a-b} 
						t1 = x[i1] - x[i2];
						x[i1] += x[i2];
						//sumdiff(x[i4], x[i3], t2, x[i2]); // {s, d}  <--| {a+b, a-b}
						t2 = x[i4] + x[i3];
						x[i2] = x[i4] - x[i3];
						t2 *= -SQRT2;
						t1 *= SQRT2;
						//sumdiff(t2, t1, x[i3], x[i4]); // {s, d}  <--| {a+b, a-b}
						x[i3] = t2 + t1;
						x[i4] = t2 - t1;
					}
				}
				ix = (id << 1) - n2;
				id <<= 2;
			} while (ix < n);
			e = TWO_PI / n2;
			for (j = 1; j < n8; j++) {
				a = j * e;
				ss1 = sin(a);
				cc1 = cos(a);
				//ss3 = sin(3*a); cc3 = cos(3*a);
				cc3 = 4 * cc1 * (cc1 * cc1 - 0.75);
				ss3 = 4 * ss1 * (0.75 - ss1 * ss1);
				ix = 0;
				id = n2 << 1;
				do {
					for (i0 = ix; i0 < n; i0 += id) {
						i1 = i0 + j;
						i2 = i1 + n4;
						i3 = i2 + n4;
						i4 = i3 + n4;
						i5 = i0 + n4 - j;
						i6 = i5 + n4;
						i7 = i6 + n4;
						i8 = i7 + n4;
						//sumdiff3(x[i1], x[i6], t1); // {a, b, d} <--| {a+b, b, a-b}
						t1 = x[i1] - x[i6];
						x[i1] += x[i6];
						//sumdiff3(x[i5], x[i2], t2); // {a, b, d} <--| {a+b, b, a-b}
						t2 = x[i5] - x[i2];
						x[i5] += x[i2];
						//sumdiff(x[i8], x[i3], t3, x[i6]); // {s, d}  <--| {a+b, a-b}
						t3 = x[i8] + x[i3];
						x[i6] = x[i8] - x[i3];
						//sumdiff(x[i4], x[i7], t4, x[i2]); // {s, d}  <--| {a+b, a-b}
						t4 = x[i4] + x[i7];
						x[i2] = x[i4] - x[i7];
						//sumdiff3(t1, t4, t5); // {a, b, d} <--| {a+b, b, a-b}
						a = t1 - t4;
						t1 += t4;
						//sumdiff3(t2, t3, t4); // {a, b, d} <--| {a+b, b, a-b}
						t4 = t2 - t3;
						t2 += t3;
						//cmult(ss1, cc1, t5, t4, x[i7], x[i3]);
						x[i7] = a * ss1 - t4 * cc1;
						x[i3] = a * cc1 + t4 * ss1;
						//cmult(cc3, ss3, t1, t2, x[i4], x[i8]);
						x[i4] = t1 * cc3 - t2 * ss3;
						x[i8] = t1 * ss3 + t2 * cc3;
					}
					ix = (id << 1) - n2;
					id <<= 2;
				} while (ix < n);
			}
		}
		for (ix = 0, id = 4; ix < n; id <<= 2) {
			for (i0 = ix; i0 < n; i0 += id) {
				//sumdiff(x[i0], x[i0+1]); // {s, d}  <--| {a+b, a-b}
				a = x[i0] - x[i0 + 1];
				x[i0] += x[i0 + 1];
				x[i0 + 1] = a;
			}
			ix = (id - 1) << 1;
		}
		return RFFT.prototype.reverseBinPermute.apply(this, [outputBuffer, x, this.invBufferSize]);
	}
}
