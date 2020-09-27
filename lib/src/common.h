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

// Must be in sync with scripts/graphicalFilterEditor/graphicalFilterEditor.ts
// Sorry, but due to the frequency mapping I created, this class will only work with
// 512 visible bins... in order to change this, a new frequency mapping must be created...
#define VisibleBinCount 512
#define ValidYRangeHeight 255
#define ZeroChannelValueY (255 >> 1)
#define MaximumChannelValue 127
#define MinimumChannelValue -127
#define MinusInfiniteChannelValue -128
#define MaximumChannelValueY 0
#define MinimumChannelValueY (255 - 1)
#define MaximumFilterLength 8192
#define EquivalentZoneCount 10

extern double lerp(double x0, double y0, double x1, double y1, double x);
extern float lerpf(float x0, float y0, float x1, float y1, float x);
