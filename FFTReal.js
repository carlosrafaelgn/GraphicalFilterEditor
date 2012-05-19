//
// FFTReal.js is distributed under the FreeBSD License
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
// https://github.com/carlosrafaelgn/GraphicalFilterEditor/blob/master/FFTReal.js
//

//==============================================================================
//
// Note: I have made A LOT OF changes to the original file (by Laurent se Soras)
// such as deleting most of the functions I would not use,
// porting everything to javaScript, reorganizing the rest of the functions,
// renaming the file, applying some minor optimizations and so on...
//
//==============================================================================

//==============================================================================
//
//        FFTReal
//        Version 2.00, 2005/10/18
//
//        Fourier transformation (FFT, IFFT) library specialised for real data
//        Portable ISO C++
//
//        (c) Laurent de Soras <laurent.de.soras@club-internet.fr>
//        Object Pascal port (c) Frederic Vanmol <frederic@fruityloops.com>
//
//==============================================================================
//
//1. Legal
//--------
//
//This library is free software; you can redistribute it and/or
//modify it under the terms of the GNU Lesser General Public
//License as published by the Free Software Foundation; either
//version 2.1 of the License, or (at your option) any later version.
//
//This library is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
//Lesser General Public License for more details.
//
//You should have received a copy of the GNU Lesser General Public
//License along with this library; if not, write to the Free Software
//Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
//
//Check the file license.txt to get full information about the license.
//

//==============================================================================
//This version is a modified one, since it does not care
//about the second half of the data!!! It simply admits
//the entire second half is = 0
//==============================================================================
"use strict";

// Ordering of data
// time [0]          | Real [bin 0]
// time [...]        | Real [bin ...]
// time [length/2]   | Real [bin length/2]
// time [length/2+1] | Imag [bin 1]
// time [...]        | Imag [bin ...]
// time [length-1]   | Imag [bin length/2-1]

function FFTReal(fftSize, sampleRate, useFloat64) {
	var tmp, tmp2;
	if (fftSize !== 2048 && fftSize !== 1024 && fftSize !== 512 && fftSize !== 256) {
		alert("Sorry, class available only for fft with the following sizes: 2048, 1024, 512 or 256! :(");
		throw "Sorry, class available only for fft with the following sizes: 2048, 1024, 512 or 256! :(";
	}
	this.FFT_SIZE = fftSize;
	this.FFT_BITS = (fftSize === 2048 ? 11 : (fftSize === 1024 ? 10 : (fftSize === 512 ? 9 : 8)));
	this.BR_ARR_SIZE_L2 = (this.FFT_BITS - 2);
	this.BR_ARR_SIZE = (1 << this.BR_ARR_SIZE_L2);
	this.TRIGO_BD = this.FFT_BITS;
	this.TRIGO_TABLE_ARR_SIZE_L2 = (this.TRIGO_BD - 2);
	this.TRIGO_TABLE_ARR_SIZE = (1 << this.TRIGO_TABLE_ARR_SIZE_L2);
	this.INVMUL = (1.0 / fftSize);
	this.SQRT2_2 = Math.SQRT2 * 0.5;
	this.brData = new Int32Array(this.BR_ARR_SIZE);
	this.trigoData = (useFloat64 ? new Float64Array(this.TRIGO_TABLE_ARR_SIZE) : new Float32Array(this.TRIGO_TABLE_ARR_SIZE));
	this.spectrum = null;
	this.sampleRate = sampleRate;
	this.bandwidth = sampleRate / fftSize;
	tmp = (useFloat64 ? new Float64Array(fftSize) : new Float32Array(fftSize));

	//when calling forward and inverse, src can be == dst
	this.process3 = FFTReal.prototype.processN(3);
	this.process4 = FFTReal.prototype.processN(4);
	this.process5 = FFTReal.prototype.processN(5);
	this.process6 = FFTReal.prototype.processN(6);
	this.iprocess3 = FFTReal.prototype.iprocessN(3);
	this.iprocess4 = FFTReal.prototype.iprocessN(4);
	this.iprocess5 = FFTReal.prototype.iprocessN(5);
	this.iprocess6 = FFTReal.prototype.iprocessN(6);
	switch (fftSize) {
		case 256:
			this.process7 = FFTReal.prototype.lastProcessN(7);
			this.iprocess7 = FFTReal.prototype.lastIProcessN(7);
			tmp2 = (useFloat64 ? new Float64Array(fftSize) : new Float32Array(fftSize));
			this.forward = function (dst, src) {
				FFTReal.prototype.process1.apply(this, [tmp, src]);
				FFTReal.prototype.process2.apply(this, [dst, tmp]);
				this.process3(tmp, dst);
				this.process4(dst, tmp);
				this.process5(tmp, dst);
				this.process6(tmp2, tmp);
				this.process7(dst, tmp2);
			};
			this.inverse = function (dst, src) {
				this.iprocess7(tmp2, src);
				this.iprocess6(tmp, tmp2);
				this.iprocess5(dst, tmp);
				this.iprocess4(tmp, dst);
				this.iprocess3(dst, tmp);
				FFTReal.prototype.iprocess2.apply(this, [tmp, dst]);
				FFTReal.prototype.iprocess1.apply(this, [dst, tmp]);
			};
			break;
		case 512:
			this.process7 = FFTReal.prototype.processN(7);
			this.process8 = FFTReal.prototype.lastProcessN(8);
			this.iprocess7 = FFTReal.prototype.iprocessN(7);
			this.iprocess8 = FFTReal.prototype.lastIProcessN(8);
			this.forward = function (dst, src) {
				FFTReal.prototype.process1.apply(this, [tmp, src]);
				FFTReal.prototype.process2.apply(this, [dst, tmp]);
				this.process3(tmp, dst);
				this.process4(dst, tmp);
				this.process5(tmp, dst);
				this.process6(dst, tmp);
				this.process7(tmp, dst);
				this.process8(dst, tmp);
			};
			this.inverse = function (dst, src) {
				this.iprocess8(tmp, src);
				this.iprocess7(dst, tmp);
				this.iprocess6(tmp, dst);
				this.iprocess5(dst, tmp);
				this.iprocess4(tmp, dst);
				this.iprocess3(dst, tmp);
				FFTReal.prototype.iprocess2.apply(this, [tmp, dst]);
				FFTReal.prototype.iprocess1.apply(this, [dst, tmp]);
			};
			break;
		case 1024:
			this.process7 = FFTReal.prototype.processN(7);
			this.process8 = FFTReal.prototype.processN(8);
			this.process9 = FFTReal.prototype.lastProcessN(9);
			this.iprocess7 = FFTReal.prototype.iprocessN(7);
			this.iprocess8 = FFTReal.prototype.iprocessN(8);
			this.iprocess9 = FFTReal.prototype.lastIProcessN(9);
			tmp2 = (useFloat64 ? new Float64Array(fftSize) : new Float32Array(fftSize));
			this.forward = function (dst, src) {
				FFTReal.prototype.process1.apply(this, [tmp, src]);
				FFTReal.prototype.process2.apply(this, [dst, tmp]);
				this.process3(tmp, dst);
				this.process4(dst, tmp);
				this.process5(tmp, dst);
				this.process6(dst, tmp);
				this.process7(tmp, dst);
				this.process8(tmp2, tmp);
				this.process9(dst, tmp2);
			};
			this.inverse = function (dst, src) {
				this.iprocess9(tmp2, src);
				this.iprocess8(tmp, tmp2);
				this.iprocess7(dst, tmp);
				this.iprocess6(tmp, dst);
				this.iprocess5(dst, tmp);
				this.iprocess4(tmp, dst);
				this.iprocess3(dst, tmp);
				FFTReal.prototype.iprocess2.apply(this, [tmp, dst]);
				FFTReal.prototype.iprocess1.apply(this, [dst, tmp]);
			};
			break;
		default:
			this.process7 = FFTReal.prototype.processN(7);
			this.process8 = FFTReal.prototype.processN(8);
			this.process9 = FFTReal.prototype.processN(9);
			this.process10 = FFTReal.prototype.lastProcessN(10);
			this.iprocess7 = FFTReal.prototype.iprocessN(7);
			this.iprocess8 = FFTReal.prototype.iprocessN(8);
			this.iprocess9 = FFTReal.prototype.iprocessN(9);
			this.iprocess10 = FFTReal.prototype.lastIProcessN(10);
			this.forward = function (dst, src) {
				FFTReal.prototype.process1.apply(this, [tmp, src]);
				FFTReal.prototype.process2.apply(this, [dst, tmp]);
				this.process3(tmp, dst);
				this.process4(dst, tmp);
				this.process5(tmp, dst);
				this.process6(dst, tmp);
				this.process7(tmp, dst);
				this.process8(dst, tmp);
				this.process9(tmp, dst);
				this.process10(dst, tmp);
			};
			this.inverse = function (dst, src) {
				this.iprocess10(tmp, src);
				this.iprocess9(dst, tmp);
				this.iprocess8(tmp, dst);
				this.iprocess7(dst, tmp);
				this.iprocess6(tmp, dst);
				this.iprocess5(dst, tmp);
				this.iprocess4(tmp, dst);
				this.iprocess3(dst, tmp);
				FFTReal.prototype.iprocess2.apply(this, [tmp, dst]);
				FFTReal.prototype.iprocess1.apply(this, [dst, tmp]);
			};
			break;
	}
	FFTReal.prototype.prepareCoefficients.apply(this);
	seal$(this);
}
FFTReal.prototype = {
	changeSampleRate: function (newSampleRate) {
		this.sampleRate = newSampleRate;
		this.bandwidth = newSampleRate / this.FFT_SIZE;
		return newSampleRate;
	},
	calculateSpectrum: function (src, outputBuffer) {
		var spectrum = (outputBuffer ? outputBuffer : this.spectrum),
			sqrt = Math.sqrt, rval, ival, i, FFT_SIZE2 = (this.FFT_SIZE >>> 1);
		if (!spectrum) {
			spectrum = new this.trigoData.constructor(FFT_SIZE2 + 1);
			this.spectrum = spectrum;
		}
		//skip dc and nyquist, as they are purely real
		spectrum[0] = src[0]; //I'm not so sure about this... Shouldn't it be multiplied by 0.5... I don't remember the rules very well
		for (i = 1; i < FFT_SIZE2; i++) {
			rval = src[i];
			ival = src[FFT_SIZE2 + i];
			spectrum[i] = sqrt((rval * rval) + (ival * ival));
		}
		spectrum[i] = src[i]; //again, not so sure about this...
		return true;
	},
	prepareCoefficients: function () {
		var FFT_BITS = this.FFT_BITS, BR_ARR_SIZE = this.BR_ARR_SIZE, TRIGO_TABLE_ARR_SIZE = this.TRIGO_TABLE_ARR_SIZE,
			br = this.brData, trigo = this.trigoData, cnt, index, br_index, bit_cnt,
			COSMUL = ((0.5 * Math.PI) / this.TRIGO_TABLE_ARR_SIZE);
		//compute internal coefs
		br[0] = 0;
		for (cnt = 1; cnt < BR_ARR_SIZE; cnt++) {
			index = cnt << 2;
			br_index = 0;
			bit_cnt = FFT_BITS;
			do {
				br_index <<= 1;
				br_index += (index & 1);
				index >>>= 1;
				bit_cnt--;
			} while (bit_cnt > 0);
			br[cnt] = br_index;
		}
		for (cnt = 0; cnt < TRIGO_TABLE_ARR_SIZE; cnt++) {
			trigo[cnt] = Math.cos(cnt * COSMUL);
		}
	},
	process1: function (dst, src) {
		// First and second pass at once
		var FFT_SIZE4 = (this.FFT_SIZE >>> 2), len = FFT_SIZE4,
		br = this.brData, dstI = 0, brI = 0, ri_0, sf_0, sf_2;
		do {
			ri_0 = br[brI];
			sf_0 = src[ri_0];
			sf_2 = src[ri_0 + FFT_SIZE4];
			dst[dstI] = sf_0 + sf_2;
			dst[dstI + 1] = sf_0;
			dst[dstI + 2] = sf_0 - sf_2;
			dst[dstI + 3] = sf_2;
			brI++;
			dstI += 4;
			len--;
		} while (len > 0);
	},
	process2: function (dst, src) {
		// Third pass
		var FFT_SIZE = this.FFT_SIZE, SQRT2_2 = this.SQRT2_2, coef_index = 0, v, v1, v2, v3;
		do {
			v1 = src[coef_index + 4];
			v = src[coef_index];
			dst[coef_index] = v + v1;
			dst[coef_index + 4] = v - v1;
			dst[coef_index + 2] = src[coef_index + 2];
			dst[coef_index + 6] = src[coef_index + 6];
			v1 = src[coef_index + 5];
			v2 = src[coef_index + 7];
			v = (v1 - v2) * SQRT2_2;
			v3 = src[coef_index + 1];
			dst[coef_index + 1] = v3 + v;
			dst[coef_index + 3] = v3 - v;
			v = (v1 + v2) * SQRT2_2;
			v3 = src[coef_index + 3];
			dst[coef_index + 5] = v + v3;
			dst[coef_index + 7] = v - v3;
			coef_index += 8;
		} while (coef_index < FFT_SIZE);
	},
	processN: function (N) {
		return function (dst, src) {
			var dist = (1 << (N - 1)), c1_r, c1_i, c2_r, c2_i, cend, FFT_SIZE = this.FFT_SIZE,
			dist2 = (dist << 1), dist3 = (dist * 3), dist4 = (dist << 2), i, c, s, v1, v2, trigo = this.trigoData,
			table_step = (this.TRIGO_TABLE_ARR_SIZE >> (N - 1)), sf_r_i, sf_i_i, sf2_r_i, sf2_i_i,
			coef_index = 0;
			do {
				c1_r = coef_index;
				c1_i = coef_index + dist;
				c2_r = coef_index + dist2;
				c2_i = coef_index + dist3;
				cend = coef_index + dist4;
				// Extreme coefficients are always real
				v1 = src[c1_r];
				v2 = src[c2_r];
				dst[c1_r] = v1 + v2;
				dst[c2_r] = v1 - v2;
				dst[c1_i] = src[c1_i];
				dst[c2_i] = src[c2_i];
				// Others are conjugate complex numbers
				for (i = 1; i < dist; i++) {
					c = trigo[i * table_step];
					s = trigo[(dist - i) * table_step];
					sf_r_i = src[c1_r + i];
					sf_i_i = src[c1_i + i];
					sf2_r_i = src[c2_r + i];
					sf2_i_i = src[c2_i + i];
					v1 = (sf2_r_i * c) - (sf2_i_i * s);
					dst[c1_r + i] = sf_r_i + v1;
					dst[c2_r - i] = sf_r_i - v1;
					v2 = (sf2_r_i * s) + (sf2_i_i * c);
					dst[c2_r + i] = v2 + sf_i_i;
					dst[cend - i] = v2 - sf_i_i;
				}
				coef_index += dist4;
			} while (coef_index < FFT_SIZE);
		};
	},
	lastProcessN: function (N) {
		return function (dst, src) {
			var dist = (1 << (N - 1)), i, c, s, sf_r_i, sf_i_i, sf2_r_i, sf2_i_i, v1, v2, trigo = this.trigoData,
			c1_r = 0, c1_i = dist, c2_r = (dist << 1), c2_i = (dist * 3), cend = (dist << 2),
			table_step = (this.TRIGO_TABLE_ARR_SIZE >>> (N - 1));
			// Extreme coefficients are always real
			v1 = src[c1_r];
			v2 = src[c2_r];
			dst[c1_r] = v1 + v2;
			dst[c2_r] = v1 - v2;
			dst[c1_i] = src[c1_i];
			dst[c2_i] = src[c2_i];
			// Others are conjugate complex numbers
			for (i = 1; i < dist; i++) {
				c = trigo[i * table_step];
				s = trigo[(dist - i) * table_step];
				sf_r_i = src[c1_r + i];
				sf_i_i = src[c1_i + i];
				sf2_r_i = src[c2_r + i];
				sf2_i_i = src[c2_i + i];
				v1 = (sf2_r_i * c) - (sf2_i_i * s);
				dst[c1_r + i] = sf_r_i + v1;
				dst[c2_r - i] = sf_r_i - v1;
				v2 = (sf2_r_i * s) + (sf2_i_i * c);
				dst[c2_r + i] = v2 + sf_i_i;
				dst[cend - i] = v2 - sf_i_i;
			}
		};
	},
	iprocess1: function (dst, src) {
		// Penultimate and last pass at once
		var FFT_SIZE = this.FFT_SIZE, FFT_SIZE4 = (this.FFT_SIZE >>> 2), v1, v2,
		br = this.brData, INVMUL = this.INVMUL, coef_index = 0, ri_0, b_0, b_1, b_2, b_3;
		do {
			ri_0 = br[coef_index >>> 2];
			v1 = src[coef_index];
			v2 = src[coef_index + 2];
			b_0 = v1 + v2;
			b_2 = v1 - v2;
			b_1 = src[coef_index + 1] * 2;
			b_3 = src[coef_index + 3] * 2;
			dst[ri_0] = (b_0 + b_1) * INVMUL;
			dst[ri_0 + (FFT_SIZE4 << 1)] = (b_0 - b_1) * INVMUL;
			dst[ri_0 + FFT_SIZE4] = (b_2 + b_3) * INVMUL;
			dst[ri_0 + (FFT_SIZE4 * 3)] = (b_2 - b_3) * INVMUL;
			coef_index += 4;
		} while (coef_index < FFT_SIZE);
	},
	iprocess2: function (dst, src) {
		// Antepenultimate pass
		var FFT_SIZE = this.FFT_SIZE, SQRT2_2 = this.SQRT2_2, coef_index = 0, vr, vi;
		do {
			dst[coef_index] = src[coef_index] + src[coef_index + 4];
			dst[coef_index + 4] = src[coef_index] - src[coef_index + 4];
			dst[coef_index + 2] = src[coef_index + 2] * 2;
			dst[coef_index + 6] = src[coef_index + 6] * 2;
			dst[coef_index + 1] = src[coef_index + 1] + src[coef_index + 3];
			dst[coef_index + 3] = src[coef_index + 5] - src[coef_index + 7];
			vr = src[coef_index + 1] - src[coef_index + 3];
			vi = src[coef_index + 5] + src[coef_index + 7];
			dst[coef_index + 5] = (vr + vi) * SQRT2_2;
			dst[coef_index + 7] = (vi - vr) * SQRT2_2;
			coef_index += 8;
		} while (coef_index < FFT_SIZE);
	},
	iprocessN: function (N) {
		return function (dst, src) {
			var dist = (1 << (N - 1)), c1_r, c1_i, c2_r, c2_i, cend,
			FFT_SIZE = this.FFT_SIZE, table_step = (this.TRIGO_TABLE_ARR_SIZE >>> (N - 1)),
			coef_index = 0, i, c, s, sf_r_i, sf_e_i, sf2_r_p_i, sf2_r_m_i, vr, vi, trigo = this.trigoData,
			dist2 = (dist << 1), dist3 = (dist * 3), dist4 = (dist << 2);
			do {
				c1_r = coef_index;
				c1_i = coef_index + dist;
				c2_r = coef_index + dist2;
				c2_i = coef_index + dist3;
				cend = coef_index + dist4;
				// Extreme coefficients are always real
				dst[c1_r] = src[c1_r] + src[c2_r];
				dst[c2_r] = src[c1_r] - src[c2_r];
				dst[c1_i] = src[c1_i] * 2;
				dst[c2_i] = src[c2_i] * 2;
				// Others are conjugate complex numbers
				for (i = 1; i < dist; i++) {
					sf_r_i = src[c1_r + i];
					sf_e_i = src[cend - i];
					sf2_r_p_i = src[c2_r + i];
					sf2_r_m_i = src[c2_r - i];
					dst[c1_r + i] = sf_r_i + sf2_r_m_i;
					dst[c1_i + i] = sf2_r_p_i - sf_e_i;
					c = trigo[i * table_step];
					s = trigo[(dist - i) * table_step];
					vr = sf_r_i - sf2_r_m_i;
					vi = sf2_r_p_i + sf_e_i;
					dst[c2_r + i] = (vr * c) + (vi * s);
					dst[c2_i + i] = (vi * c) - (vr * s);
				}
				coef_index += dist4;
			} while (coef_index < FFT_SIZE);
		};
	},
	lastIProcessN: function (N) {
		return function (dst, src) {
			var dist = (1 << (N - 1)),
			table_step = (this.TRIGO_TABLE_ARR_SIZE >>> (N - 1)),
			i, c, s, sf_r_i, sf_e_i, sf2_r_p_i, sf2_r_m_i, vr, vi, trigo = this.trigoData,
			c1_r = 0, c1_i = dist, c2_r = (dist << 1), c2_i = (dist * 3), cend = (dist << 2);
			// Extreme coefficients are always real
			dst[c1_r] = src[c1_r] + src[c2_r];
			dst[c2_r] = src[c1_r] - src[c2_r];
			dst[c1_i] = src[c1_i] * 2;
			dst[c2_i] = src[c2_i] * 2;
			// Others are conjugate complex numbers
			for (i = 1; i < dist; i++) {
				sf_r_i = src[c1_r + i];
				sf_e_i = src[cend - i];
				sf2_r_p_i = src[c2_r + i];
				sf2_r_m_i = src[c2_r - i];
				dst[c1_r + i] = sf_r_i + sf2_r_m_i;
				dst[c1_i + i] = sf2_r_p_i - sf_e_i;
				c = trigo[i * table_step];
				s = trigo[(dist - i) * table_step];
				vr = sf_r_i - sf2_r_m_i;
				vi = sf2_r_p_i + sf_e_i;
				dst[c2_r + i] = (vr * c) + (vi * s);
				dst[c2_i + i] = (vi * c) - (vr * s);
			}
		};
	}
};
