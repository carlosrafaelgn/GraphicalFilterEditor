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

class GraphicalFilterEditorStrings {
	public static Minus0 = "-0.00";

	public static Cursor = "Cursor: ";
	public static Curve = "Curve: ";
	public static Frequency = "Frequency: ";
	public static SameCurve = "Same curve for both channels";
	public static UseLeftCurve = "Use left curve";
	public static UseRightCurve = "Use right curve";
	public static OneForEach = "One curve for each channel";
	public static ShowLeftCurve = "Show left curve";
	public static ShowRightCurve = "Show right curve";
	public static ResetCurve = "Reset curve";
	public static EditMode = "Edit mode";
	public static Regular = "Regular";
	public static Zones = "Zones";
	public static SmoothNarrow = "Smooth (narrow)";
	public static SmoothWide = "Smooth (wide)";
	public static PeakingEq = "10-band Peaking Filter";
	public static ShelfEq = "7-band Low Shelf Filter";
	public static NormalizeCurves = "Normalize curves";
	public static ShowZones = "Show zones";
	public static ShowActualResponse = "Show actual response";
	public static MinusInfinity = "-Inf.";

	public static toFixed = function (x: number, fractionDigits: number): string { return x.toFixed(fractionDigits); };

	public static init(language: string): void {
		if (language && language.toLowerCase().indexOf("pt") === 0) {
			GraphicalFilterEditorStrings.Minus0 = "-0,00";

			//GraphicalFilterEditorStrings.Cursor = "Cursor: ";
			GraphicalFilterEditorStrings.Curve = "Curva: ";
			GraphicalFilterEditorStrings.Frequency = "Frequência: ";
			GraphicalFilterEditorStrings.SameCurve = "Mesma curva para ambos canais";
			GraphicalFilterEditorStrings.UseLeftCurve = "Usar curva da esquerda";
			GraphicalFilterEditorStrings.UseRightCurve = "Usar curva da direita";
			GraphicalFilterEditorStrings.OneForEach = "Uma curva por canal";
			GraphicalFilterEditorStrings.ShowLeftCurve = "Exibir curva da esquerda";
			GraphicalFilterEditorStrings.ShowRightCurve = "Exibir curva da direita";
			GraphicalFilterEditorStrings.ResetCurve = "Zerar curva";
			GraphicalFilterEditorStrings.EditMode = "Modo de edição";
			GraphicalFilterEditorStrings.Regular = "Normal";
			GraphicalFilterEditorStrings.Zones = "Zonas";
			GraphicalFilterEditorStrings.SmoothNarrow = "Suave (estreito)";
			GraphicalFilterEditorStrings.SmoothWide = "Suave (largo)";
			GraphicalFilterEditorStrings.PeakingEq = "Filtro \"Peaking\" de 10 Bandas";
			GraphicalFilterEditorStrings.ShelfEq = "Filtro \"Low Shelf\" de 7 Bandas";
			GraphicalFilterEditorStrings.NormalizeCurves = "Normalizar curvas";
			GraphicalFilterEditorStrings.ShowZones = "Exibir zonas";
			GraphicalFilterEditorStrings.ShowActualResponse = "Exibir resposta real";
			//GraphicalFilterEditorStrings.MinusInfinity = "-Inf.";

			GraphicalFilterEditorStrings.toFixed = function (x: number, fractionDigits: number): string { return x.toFixed(fractionDigits).replace(".", ","); };
		}
	}
}
