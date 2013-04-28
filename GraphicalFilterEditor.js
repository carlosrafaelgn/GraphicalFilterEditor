//
// GraphicalFilterEditor.js is distributed under the FreeBSD License
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
// https://github.com/carlosrafaelgn/GraphicalFilterEditor/blob/master/GraphicalFilterEditor.js
//
"use strict";

function GraphicalFilterEditor(filterLength, sampleRate, audioContext) {
	if (filterLength < 8 || (filterLength & (filterLength - 1))) {
		alert("Sorry, class available only for fft sizes that are a power of 2 >= 8! :(");
		throw "Sorry, class available only for fft sizes that are a power of 2 >= 8! :(";
	}
	this.filterLength = filterLength;
	this.sampleRate = sampleRate;
	this.isNormalized = false;
	this.binCount = (filterLength >>> 1) + 1;
	this.audioContext = audioContext;
	this.filterKernel = audioContext.createBuffer(2, filterLength, sampleRate);
	this.convolver = audioContext.createConvolver();
	this.convolver.normalize = false;
	this.convolver.buffer = this.filterKernel;
	this.tmp = new Float32Array(filterLength);
	this.channelCurves = [new Int16Array(GraphicalFilterEditor.prototype.visibleBinCount), new Int16Array(GraphicalFilterEditor.prototype.visibleBinCount)];
	this.actualChannelCurve = new Int16Array(GraphicalFilterEditor.prototype.visibleBinCount);

	for (var i = (GraphicalFilterEditor.prototype.visibleBinCount - 1); i >= 0; i--) {
		this.channelCurves[0][i] = GraphicalFilterEditor.prototype.zeroChannelValueY;
		this.channelCurves[1][i] = GraphicalFilterEditor.prototype.zeroChannelValueY;
		this.actualChannelCurve[i] = GraphicalFilterEditor.prototype.zeroChannelValueY;
	}

	this.updateFilter(0, true, true);
	this.updateActualChannelCurve(0);

	seal$(this);
}

GraphicalFilterEditor.prototype = {
	visibleBinCount: 512,
	visibleFrequencies: null,
	equivalentZones: null,
	equivalentZonesFrequencyCount: null,
	validYRangeHeight: 255,
	zeroChannelValueY: 255 >>> 1,
	maximumChannelValue: 127,
	minimumChannelValue: -127,
	minusInfiniteChannelValue: -128,
	maximumChannelValueY: 0,
	minimumChannelValueY: 255 - 1,
	initialize: function () {
		var i, s, freqSteps = new Uint16Array([5, 5, 5, 5, 10, 10, 20, 40, 80, 89]),
		firstFreqs = new Uint16Array([5, 50, 95, 185, 360, 720, 1420, 2860, 5740, 11498]),
		f = firstFreqs[0];
		//sorry, but due to the frequency mapping I created, this class will only work with
		//512 visible bins... in order to change this, a new frequency mapping must be created...
		if (GraphicalFilterEditor.prototype.visibleBinCount !== 512) {
			alert("Sorry, class available only for 512 bins! :(");
			throw "Sorry, class available only for 512 bins! :(";
		}
		GraphicalFilterEditor.prototype.visibleFrequencies = new Uint16Array(GraphicalFilterEditor.prototype.visibleBinCount);
		GraphicalFilterEditor.prototype.equivalentZones = new Uint16Array([31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
		GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount = new Uint16Array([0, 9, 9 + 9, 18 + 9 + 9, 35 + 18 + 9 + 9, 36 + 35 + 18 + 9 + 9, 70 + 36 + 35 + 18 + 9 + 9, 72 + 70 + 36 + 35 + 18 + 9 + 9, 72 + 72 + 70 + 36 + 35 + 18 + 9 + 9, 72 + 72 + 72 + 70 + 36 + 35 + 18 + 9 + 9, 512]);
		for (i = 0, s = 0; i < GraphicalFilterEditor.prototype.visibleBinCount; i++) {
			this.visibleFrequencies[i] = f;
			if (s !== (GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount.length - 1) && s !== (firstFreqs.length - 1) && (i + 1) >= GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount[s + 1]) {
				s++;
				f = firstFreqs[s];
			} else {
				f += freqSteps[s];
			}
		}
		return true;
	},
	lerp: function (x0, y0, x1, y1, x) {
		return ((x - x0) * (y1 - y0) / (x1 - x0)) + y0;
	},
	clampY: function (y) {
		return ((y <= GraphicalFilterEditor.prototype.maximumChannelValueY) ? GraphicalFilterEditor.prototype.maximumChannelValueY :
						((y > GraphicalFilterEditor.prototype.minimumChannelValueY) ? (GraphicalFilterEditor.prototype.validYRangeHeight + 1) :
							y));
	},
	yToDB: function (y) {
		return ((y <= GraphicalFilterEditor.prototype.maximumChannelValueY) ? 40 :
						((y > GraphicalFilterEditor.prototype.minimumChannelValueY) ? -Infinity :
							GraphicalFilterEditor.prototype.lerp(GraphicalFilterEditor.prototype.maximumChannelValueY, 40, GraphicalFilterEditor.prototype.minimumChannelValueY, -40, y)));
	},
	yToMagnitude: function (y) {
		//40dB = 100
		//-40dB = 0.01
		//magnitude = 10 ^ (dB/20)
		//log a (x^p) = p * log a (x)
		//x^p = a ^ (p * log a (x))
		//10^p = e ^ (p * log e (10))
		return ((y <= GraphicalFilterEditor.prototype.maximumChannelValueY) ? 100 :
						((y > GraphicalFilterEditor.prototype.minimumChannelValueY) ? 0 :
							Math.exp(GraphicalFilterEditor.prototype.lerp(GraphicalFilterEditor.prototype.maximumChannelValueY, 2, GraphicalFilterEditor.prototype.minimumChannelValueY, -2, y) * Math.LN10))); //2 = 40dB/20
	},
	magnitudeToY: function (magnitude) {
		//40dB = 100
		//-40dB = 0.01
		return ((magnitude >= 100) ? GraphicalFilterEditor.prototype.maximumChannelValueY :
						((magnitude < 0.01) ? (GraphicalFilterEditor.prototype.validYRangeHeight + 1) :
							Math.round((GraphicalFilterEditor.prototype.zeroChannelValueY - (GraphicalFilterEditor.prototype.zeroChannelValueY * Math.log(magnitude) / Math.LN10 * 0.5)) - 0.4)));
	},
	visibleBinToZoneIndex: function (visibleBinIndex) {
		if (visibleBinIndex >= (GraphicalFilterEditor.prototype.visibleBinCount - 1)) {
			return GraphicalFilterEditor.prototype.equivalentZones.length - 1;
		} else if (visibleBinIndex > 0) {
			var i, z = GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount;
			for (i = z.length - 1; i >= 0; i--) {
				if (visibleBinIndex >= z[i])
					return i;
			}
		}
		return 0;
	},
	visibleBinToFrequency: function (visibleBinIndex, returnGroup) {
		var i, ezc, ez = GraphicalFilterEditor.prototype.equivalentZones,
		vf = GraphicalFilterEditor.prototype.visibleFrequencies, vbc = GraphicalFilterEditor.prototype.visibleBinCount;
		if (visibleBinIndex >= (vbc - 1)) {
			return (returnGroup ? [vf[vbc - 1], ez[ez.length - 1]] : vf[vbc - 1]);
		} else if (visibleBinIndex > 0) {
			if (returnGroup) {
				ezc = GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount;
				for (i = ezc.length - 1; i >= 0; i--) {
					if (visibleBinIndex >= ezc[i])
						return [vf[visibleBinIndex], ez[i]];
				}
			} else {
				return vf[visibleBinIndex];
			}
		}
		return (returnGroup ? [vf[0], ez[0]] : vf[0]);
	},
	changeZoneY: function (channelIndex, x, y) {
		var i = GraphicalFilterEditor.prototype.visibleBinToZoneIndex(x),
		ii = GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount[i + 1],
		cy = GraphicalFilterEditor.prototype.clampY(y), curve = this.channelCurves[channelIndex];
		for (i = GraphicalFilterEditor.prototype.equivalentZonesFrequencyCount[i]; i < ii; i++)
			curve[i] = cy;
		return true;
	},
	copyFilter: function (sourceChannel, destinationChannel) {
		var i, src = this.filterKernel.getChannelData(sourceChannel),
		dst = this.filterKernel.getChannelData(destinationChannel);
		for (i = (this.filterLength - 1); i >= 0; i--)
			dst[i] = src[i];
		this.convolver.buffer = this.filterKernel;
		return true;
	},
	updateFilter: function (channelIndex, isSameFilterLR, updateBothChannels) {
		var i, ii, k, mag, maxMag = 0, freq, filterLength = this.filterLength, y2mag = GraphicalFilterEditor.prototype.yToMagnitude,
		curve = this.channelCurves[channelIndex], valueCount = GraphicalFilterEditor.prototype.visibleBinCount, bw = this.sampleRate / filterLength,
		lerp = GraphicalFilterEditor.prototype.lerp, filterLength2 = (filterLength >>> 1), filter = this.filterKernel.getChannelData(channelIndex),
		sin = Math.sin, cos = Math.cos, avg, avgCount, visibleFrequencies = GraphicalFilterEditor.prototype.visibleFrequencies,
		//M = ((FFT length/2) - 1)
		M_HALF_PI_FFTLEN2 = (filterLength2 - 1) * 0.5 * Math.PI / filterLength2;
		i = 1;
		ii = 0;
		for (; ; ) {
			freq = bw * i;
			if (freq >= visibleFrequencies[0]) break;
			mag = y2mag(curve[0]); //re
			filter[i << 1] = mag;
			if (mag > maxMag) maxMag = mag;
			i++;
		}
		while (bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii]) && i < filterLength2 && ii < (valueCount - 1)) {
			freq = bw * i;
			avg = 0;
			avgCount = 0;
			do {
				avg += curve[ii];
				avgCount++;
				ii++;
			} while (freq > visibleFrequencies[ii] && ii < (valueCount - 1));
			mag = y2mag(avg / avgCount); //re
			filter[i << 1] = mag;
			if (mag > maxMag) maxMag = mag;
			i++;
		}
		for (; i < filterLength2; i++) {
			freq = bw * i;
			if (freq >= visibleFrequencies[valueCount - 1]) {
				mag = y2mag(curve[valueCount - 1]); //re
			} else {
				while (ii < (valueCount - 1) && freq > visibleFrequencies[ii + 1])
					ii++;
				mag = y2mag(lerp(visibleFrequencies[ii], curve[ii], visibleFrequencies[ii + 1], curve[ii + 1], freq)); //re
			}
			filter[i << 1] = mag;
			if (mag > maxMag) maxMag = mag;
		}
		if (this.isNormalized && maxMag) {
			for (i = filterLength - 2; i >= 0; i -= 2)
				filter[i] /= maxMag;
			filter[1] /= maxMag; //Nyquist
		}
		//convert the coordinates from polar to rectangular
		//dc and nyquist are purely real (for dc, cos(-k) = 1,
		//as for nyquist, cos(-k) = 0) so do not bother with them in here
		filter[0] = (filter[2] >= 1 ? 1 : filter[2]); //make sure dc has no gain
		filter[1] = (filter[filterLength - 2] >= 1 ? 1 : filter[filterLength - 2]); //make sure Nyquist has no gain
		for (i = filterLength - 2; i >= 2; i -= 2) {
			//               -k.j
			//polar = Mag . e
			//
			//where:
			//k = (M / 2) * pi * i / (fft length / 2)
			//i = index varying from 0 to (fft length / 2)
			//
			//rectangular:
			//real = Mag . cos(-k)
			//imag = Mag . sin(-k)
			k = M_HALF_PI_FFTLEN2 * (i >> 1);
			//****NOTE:
			//when using FFTReal ou FFTNR, k MUST BE passed as the argument of sin and cos, due to the
			//signal of the imaginary component
			//RFFT, intel and other fft's use the opposite signal... therefore, -k MUST BE passed!!
			filter[i + 1] = (filter[i] * sin(k));
			filter[i] *= cos(k);
		}
		FFTNR.real(filter, filterLength, -1);
		if (isSameFilterLR) {
			//copy the filter to the other channel
			return this.copyFilter(channelIndex, 1 - channelIndex);
		} else if (updateBothChannels) {
			//update the other channel as well
			return this.updateFilter(1 - channelIndex, false, false);
		}
		this.convolver.buffer = this.filterKernel;
		return true;
	},
	updateActualChannelCurve: function (channelIndex) {
		var freq, i, ii, rval, ival, avg, avgCount, filterLength = this.filterLength, lerp = GraphicalFilterEditor.prototype.lerp,
		curve = this.actualChannelCurve, valueCount = GraphicalFilterEditor.prototype.visibleBinCount, sqrt = Math.sqrt,
		bw = this.sampleRate / filterLength, filterLength2 = (filterLength >>> 1), cos = Math.cos, tmp = this.tmp,
		mag2y = GraphicalFilterEditor.prototype.magnitudeToY, visibleFrequencies = GraphicalFilterEditor.prototype.visibleFrequencies,
		filter = this.filterKernel.getChannelData(channelIndex),
		M = (filterLength2 - 1), PI2_M = 2 * Math.PI / M;
		//it is not possible to know what kind of window the browser will use,
		//so make an assumption here... Blackman window!
		//...at least it is the one I used, back in C++ times :)
		for (i = M; i >= 0; i--) {
			//Hanning window
			//tmp[i] = filter[i] * (0.5 - (0.5 * cos(PI2_M * i)));
			//Hamming window
			//tmp[i] = filter[i] * (0.54 - (0.46 * cos(PI2_M * i)));
			//Blackman window
			tmp[i] = filter[i] * (0.42 - (0.5 * cos(PI2_M * i)) + (0.08 * cos(2 * PI2_M * i)));
		}
		for (i = filterLength - 1; i > M; i--)
			tmp[i] = 0;

		//calculate the spectrum
		FFTNR.real(tmp, filterLength, 1);
		//save Nyquist for later
		ii = tmp[1];
		for (i = 2; i < filterLength; i += 2) {
			rval = tmp[i];
			ival = tmp[i + 1];
			tmp[i >>> 1] = sqrt((rval * rval) + (ival * ival));
		}
		//restore Nyquist in its new position
		tmp[filterLength2] = ii;

		//tmp now contains (filterLength2 + 1) magnitudes
		i = 0;
		ii = 0;
		while (ii < (valueCount - 1) && i < filterLength2 && bw > (visibleFrequencies[ii + 1] - visibleFrequencies[ii])) {
			freq = bw * i;
			while (i < filterLength2 && (freq + bw) < visibleFrequencies[ii]) {
				i++;
				freq = bw * i;
			}
			curve[ii] = mag2y(lerp(freq, tmp[i], freq + bw, tmp[i + 1], visibleFrequencies[ii]));
			ii++;
		}
		i++;
		while (i < filterLength2 && ii < valueCount) {
			avg = 0;
			avgCount = 0;
			do {
				avg += tmp[i];
				avgCount++;
				i++;
				freq = bw * i;
			} while (freq < visibleFrequencies[ii] && i < filterLength2);
			curve[ii] = mag2y(avg / avgCount);
			ii++;
		}
		i = (((this.sampleRate >>> 1) >= visibleFrequencies[valueCount - 1]) ? curve[ii - 1] : (GraphicalFilterEditor.prototype.validYRangeHeight + 1));
		for (; ii < valueCount; ii++)
			curve[ii] = i;
		return true;
	},
	changeFilterLength: function (newFilterLength, channelIndex, isSameFilterLR) {
		if (newFilterLength !== this.filterLength) {
			this.filterLength = newFilterLength;
			this.binCount = (newFilterLength >>> 1) + 1;
			this.filterKernel = this.audioContext.createBuffer(2, newFilterLength, this.sampleRate);
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	},
	changeSampleRate: function (newSampleRate, channelIndex, isSameFilterLR) {
		if (newSampleRate !== this.sampleRate) {
			this.sampleRate = newSampleRate;
			this.filterKernel = this.audioContext.createBuffer(2, this.filterLength, newSampleRate);
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	},
	changeIsNormalized: function (isNormalized, channelIndex, isSameFilterLR) {
		if (!isNormalized !== !this.isNormalized) {
			this.isNormalized = !!isNormalized;
			this.updateFilter(channelIndex, isSameFilterLR, true);
			return true;
		}
		return false;
	}
};
GraphicalFilterEditor.prototype.initialize();
