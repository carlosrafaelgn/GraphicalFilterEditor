//
// GraphicalFilterEditor is distributed under the FreeBSD License
//
// Copyright (c) 2012-2015, Carlos Rafael Gimenes das Neves
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
// https://github.com/carlosrafaelgn/GraphicalFilterEditor
//
"use strict";

function Program(gl, vertexShader, fragmentShader, vertexShaderIsPath, fragmentShaderIsPath) {
	var i, src, msg, attribs = [], uniforms = [], utypes = [];

	this.gl = gl;
	this.program = gl.createProgram();
	this.vs = gl.createShader(gl.VERTEX_SHADER);
	this.fs = gl.createShader(gl.FRAGMENT_SHADER);

	src = Program.prototype.textFromShader(vertexShader, vertexShaderIsPath);
	gl.shaderSource(this.vs, src);
	gl.compileShader(this.vs);
	if (!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)) {
		msg = "Vertex shader: " + gl.getShaderInfoLog(this.vs);
		this.deleteAll();
		alert(msg);
		throw msg;
	}
	this.getAttribsAndUniforms(src, attribs, uniforms, utypes);

	src = Program.prototype.textFromShader(fragmentShader, fragmentShaderIsPath);
	gl.shaderSource(this.fs, src);
	gl.compileShader(this.fs);
	if (!gl.getShaderParameter(this.fs, gl.COMPILE_STATUS)) {
		msg = "Fragment shader: " + gl.getShaderInfoLog(this.fs);
		this.deleteAll();
		alert(msg);
		throw msg;
	}
	this.getAttribsAndUniforms(src, attribs, uniforms, utypes);

	gl.attachShader(this.program, this.vs);
	gl.attachShader(this.program, this.fs);
	// This way all attributes are numbered starting at 0, beginning with
	// the first attribute found in the file
	for (i = 0; i < attribs.length; i++) {
		gl.bindAttribLocation(this.program, i, attribs[i]);
	}
	gl.linkProgram(this.program);

	for (i = 0; i < uniforms.length; i++) {
		this.prepareUniform(uniforms[i], utypes[i]);
	}
}
Program.prototype = {
	createGL: function (canvas, opts) {
		var i, gl = null, ctxName = ["webkit-3d", "moz-webgl", "webgl", "experimental-webgl"];
		for (i = 0; i < ctxName.length; i++) {
			try {
				gl = canvas.getContext(ctxName[i], opts);
			} catch (ex) {
			}
			if (gl) return gl;
		}
		return null;
	},
	textFromShader: function (shader, shaderIsPath) {
		if (shader.length && !shaderIsPath)
			return shader;
		if (shaderIsPath || ((!shader.text || !shader.text.length) && shader.src && shader.src.length)) {
			try {
				var xhr = new XMLHttpRequest();
				xhr.open("GET", shaderIsPath ? shader : shader.src, false);
				xhr.send();
				return xhr.responseText;
			} catch (ex) {
				alert(ex.toString());
				throw ex;
			}
		}
		return shader.text;
	},
	use: function () {
		return this.gl.useProgram(this.program);
	},
	deleteAll: function () {
		this.gl.useProgram(null);
		if (this.vs) {
			this.gl.detachShader(this.program, this.vs);
			this.gl.deleteShader(this.vs);
			this.vs = null;
		}
		if (this.fs) {
			this.gl.detachShader(this.program, this.fs);
			this.gl.deleteShader(this.fs);
			this.fs = null;
		}
		if (this.program) {
			this.gl.deleteProgram(this.program);
			this.program = null;
		}
		return true;
	},
	prepareUniform: function (u, t) {
		var gl = this.gl, l = gl.getUniformLocation(this.program, u);
		if (!this[u]) {
			if (t === "bool" || t === "int" || t === "sampler2D") {
				this[u] = function (i) { return gl.uniform1i(l, i); }
			} else if (t === "float") {
				this[u] = function (f) { return gl.uniform1f(l, f); }
			} else if (t === "vec2") {
				this[u] = function (x, y) { return gl.uniform2f(l, x, y); }
				this[u + "v"] = function (v) { return gl.uniform2fv(l, v); }
			} else if (t === "vec3") {
				this[u] = function (x, y, z) { return gl.uniform3f(l, x, y, z); }
				this[u + "v"] = function (v) { return gl.uniform3fv(l, v); }
			} else if (t === "vec4") {
				this[u] = function (x, y, z, w) { return gl.uniform4f(l, x, y, z, w); }
				this[u + "v"] = function (v) { return gl.uniform4fv(l, v); }
			} else if (t === "mat4") {
				this[u] = function (mat) { return gl.uniformMatrix4fv(l, false, mat.m); }
			} else {
				return false;
			}
		}
		return true;
	},
	getAttribsAndUniforms: function (src, attribs, uniforms, utypes) {
		// This is a very simple parser, which handles only lines starting with "uniform",
		// with "attribute or lines starting with a // comment
		var i, ii, line, lines = src.split("\n"), tokens, token, currentType, breakNow, lastChar;
		for (i = 0; i < lines.length; i++) {
			// Remove extra spaces from the beginning and from the end of the line
			line = lines[i].replace(/^\s+|\s+$/g, "");
			if (line.substr(0, 7) === "uniform") {
				// We do not consider the possibility of "\t" separating tokens (for now)
				tokens = line.split(" ");
				// Skip the "uniform" token and store the current type to be used aftwerwards
				currentType = tokens[1];
				for (ii = 2; ii < tokens.length; ii++) {
					token = tokens[ii];
					if (token === ";") break;
					lastChar = token.charAt(token.length - 1);
					breakNow = (lastChar === ";");
					if (lastChar === "," || breakNow) token = token.substr(0, token.length - 1);
					if (token !== "," && token.length) {
						uniforms.push(token);
						utypes.push(currentType);
					}
					if (breakNow) break;
				}
			} else if (line.substr(0, 9) === "attribute") {
				// We do not consider the possibility of "\t" separating tokens (for now)
				tokens = line.split(" ");
				// Skip the "attribute" token and store the current type to be used aftwerwards
				for (ii = 2; ii < tokens.length; ii++) {
					token = tokens[ii];
					if (token === ";") break;
					lastChar = token.charAt(token.length - 1);
					breakNow = (lastChar === ";");
					if (lastChar === "," || breakNow) token = token.substr(0, token.length - 1);
					if (token !== "," && token.length) {
						attribs.push(token);
					}
					if (breakNow) break;
				}
			}
		}
		return true;
	}
};
