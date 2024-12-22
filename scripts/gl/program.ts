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

class Program {
	public readonly gl: WebGLRenderingContext;
	private readonly _program: WebGLProgram;
	private readonly _vs: WebGLShader;
	private readonly _fs: WebGLShader;

	[uniformName: string]: any;

	public static create(canvas: HTMLCanvasElement, options: any, vertexShaderSource: string, fragmentShaderSource: string): Program | null {
		const ctxName = ["webkit-3d", "moz-webgl", "webgl", "experimental-webgl"];

		for (let i = 0; i < ctxName.length; i++) {
			try {
				const gl = canvas.getContext(ctxName[i], options) as WebGLRenderingContext;
				return new Program(gl, vertexShaderSource, fragmentShaderSource);
			} catch (ex) {
			}
		}

		return null;
	}

	private constructor(gl: WebGLRenderingContext, vertexShaderSource: string, fragmentShaderSource: string) {
		const attribs: string[] = [],
			uniforms: string[] = [],
			utypes: string[] = [];

		this.gl = gl;
		const program = gl.createProgram();
		if (!program)
			throw new Error("Null program");
		this._program = program;

		const vs = gl.createShader(gl.VERTEX_SHADER);
		if (!vs)
			throw new Error("Null vertex shader");
		this._vs = vs;

		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		if (!fs)
			throw new Error("Null fragment shader");
		this._fs = fs;

		gl.shaderSource(this._vs, vertexShaderSource);
		gl.compileShader(this._vs);
		if (!gl.getShaderParameter(this._vs, gl.COMPILE_STATUS)) {
			const msg = "Vertex shader: " + gl.getShaderInfoLog(this._vs);
			this.destroy();
			alert(msg);
			throw msg;
		}
		this.getAttribsAndUniforms(vertexShaderSource, attribs, uniforms, utypes);

		gl.shaderSource(this._fs, fragmentShaderSource);
		gl.compileShader(this._fs);
		if (!gl.getShaderParameter(this._fs, gl.COMPILE_STATUS)) {
			const msg = "Fragment shader: " + gl.getShaderInfoLog(this._fs);
			this.destroy();
			alert(msg);
			throw msg;
		}
		this.getAttribsAndUniforms(fragmentShaderSource, attribs, uniforms, utypes);

		gl.attachShader(this._program, this._vs);
		gl.attachShader(this._program, this._fs);
		// This way all attributes are numbered starting at 0, beginning with
		// the first attribute found in the file
		for (let i = 0; i < attribs.length; i++)
			gl.bindAttribLocation(this._program, i, attribs[i]);
		gl.linkProgram(this._program);

		for (let i = 0; i < uniforms.length; i++)
			this.prepareUniform(uniforms[i], utypes[i]);
	}

	private getAttribsAndUniforms(src: string, attribs: string[], uniforms: string[], utypes: string[]): void {
		// This is a very simple parser, which handles only lines starting with "uniform",
		// with "attribute or lines starting with a // comment
		const lines = src.split("\n");

		for (let i = 0; i < lines.length; i++) {
			// Remove extra spaces from the beginning and from the end of the line
			const line = lines[i].trim();
			if (line.substring(0, 7) === "uniform") {
				// We do not consider the possibility of "\t" separating tokens (for now)
				const tokens = line.split(" ");
				// Skip the "uniform" token and store the current type to be used aftwerwards
				const currentType = tokens[1];
				for (let ii = 2; ii < tokens.length; ii++) {
					let token = tokens[ii];
					if (token === ";")
						break;
					const lastChar = token.charAt(token.length - 1);
					const breakNow = (lastChar === ";");
					if (lastChar === "," || breakNow)
						token = token.substring(0, token.length - 1);
					if (token !== "," && token.length) {
						uniforms.push(token);
						utypes.push(currentType);
					}
					if (breakNow)
						break;
				}
			} else if (line.substring(0, 9) === "attribute") {
				// We do not consider the possibility of "\t" separating tokens (for now)
				const tokens = line.split(" ");
				// Skip the "attribute" token and store the current type to be used aftwerwards
				for (let ii = 2; ii < tokens.length; ii++) {
					let token = tokens[ii];
					if (token === ";")
						break;
					const lastChar = token.charAt(token.length - 1);
					const breakNow = (lastChar === ";");
					if (lastChar === "," || breakNow)
						token = token.substring(0, token.length - 1);
					if (token !== "," && token.length)
						attribs.push(token);
					if (breakNow)
						break;
				}
			}
		}
	}

	private prepareUniform(u: string, t: string): boolean {
		const gl = this.gl, l = gl.getUniformLocation(this._program, u);
		if (!this[u]) {
			if (t === "bool" || t === "int" || t === "sampler2D") {
				this[u] = function (i: number): void { gl.uniform1i(l, i); }
			} else if (t === "float") {
				this[u] = function (f: number): void { gl.uniform1f(l, f); }
			} else if (t === "vec2") {
				this[u] = function (x: number, y: number) : void{ gl.uniform2f(l, x, y); }
				this[u + "v"] = function (v: Float32List): void { gl.uniform2fv(l, v); }
			} else if (t === "vec3") {
				this[u] = function (x: number, y: number, z: number): void { gl.uniform3f(l, x, y, z); }
				this[u + "v"] = function (v: Float32List): void { gl.uniform3fv(l, v); }
			} else if (t === "vec4") {
				this[u] = function (x: number, y: number, z: number, w: number): void { gl.uniform4f(l, x, y, z, w); }
				this[u + "v"] = function (v: Float32List): void { gl.uniform4fv(l, v); }
			} else if (t === "mat4") {
				this[u] = function (mat: Float32List): void { gl.uniformMatrix4fv(l, false, mat); }
			} else {
				return false;
			}
		}
		return true;
	}

	public use(): void {
		this.gl.useProgram(this._program);
	}

	public destroy(): void {
		if (this.gl) {
			this.gl.useProgram(null);
			if (this._vs) {
				this.gl.detachShader(this._program, this._vs);
				this.gl.deleteShader(this._vs);
			}
			if (this._fs) {
				this.gl.detachShader(this._program, this._fs);
				this.gl.deleteShader(this._fs);
			}
			if (this._program)
				this.gl.deleteProgram(this._program);
			zeroObject(this);
		}
	}
}
