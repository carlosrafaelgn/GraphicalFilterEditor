@ECHO OFF

SET LIB_DIR=lib
SET SRC_DIR=%LIB_DIR%\src

SET SRCS=^
	%SRC_DIR%\fft4g.c ^
	%SRC_DIR%\fft4gf.c ^
	%SRC_DIR%\graphicalFilterEditor.c ^
	%SRC_DIR%\plainAnalyzer.c ^
	%SRC_DIR%\waveletAnalyzer.c

REM General options: https://emscripten.org/docs/tools_reference/emcc.html
REM -s flags: https://github.com/emscripten-core/emscripten/blob/master/src/settings.js
REM
REM Extra:
REM https://emscripten.org/docs/porting/Debugging.html
REM https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#interacting-with-code-ccall-cwrap
REM -s EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap']
REM
REM Debugging:
REM https://emscripten.org/docs/porting/Debugging.html#debugging-debug-information-g
REM https://emscripten.org/docs/tools_reference/emcc.html
REM -s ASSERTIONS=2
REM -s STACK_OVERFLOW_CHECK=2
REM -g4
REM --source-map-base '/GraphicalFilterEditor/'
REM
REM As of August 2020, WASM=2 does not work properly, even if loading the correct file
REM manually during runtime... That's why I'm compiling it twice...
REM
REM 8388608 bytes (2097152 stack + 6291456 heap) is enough to hold even the largest
REM structure, ImageInfo, which has a total of 4719244 bytes.

DEL %LIB_DIR%\lib.js
DEL %LIB_DIR%\lib.js.mem
DEL %LIB_DIR%\lib.wasm
DEL %LIB_DIR%\lib-nowasm.js

CALL emcc ^
	-I%SRC_DIR% ^
	-s WASM=0 ^
	-s PRECISE_F32=0 ^
	-s DYNAMIC_EXECUTION=0 ^
	-s EXPORTED_FUNCTIONS="['_allocBuffer', '_freeBuffer', '_fftSizeOf', '_fftInit', '_fftAlloc', '_fftFree', '_fftChangeN', '_fftSizeOff', '_fftInitf', '_fftAllocf', '_fftFreef', '_fftChangeNf', '_fft', '_ffti', '_fftf', '_fftif', '_graphicalFilterEditorAlloc', '_graphicalFilterEditorGetFilterKernelBuffer', '_graphicalFilterEditorGetChannelCurve', '_graphicalFilterEditorGetActualChannelCurve', '_graphicalFilterEditorGetVisibleFrequencies', '_graphicalFilterEditorGetEquivalentZones', '_graphicalFilterEditorGetEquivalentZonesFrequencyCount', '_graphicalFilterEditorUpdateFilter', '_graphicalFilterEditorUpdateActualChannelCurve', '_graphicalFilterEditorChangeFilterLength', '_graphicalFilterEditorFree', '_plainAnalyzer', '_waveletAnalyzer']" ^
	-s EXTRA_EXPORTED_RUNTIME_METHODS="[stackSave, stackAlloc, stackRestore]" ^
	-s ALLOW_MEMORY_GROWTH=0 ^
	-s INITIAL_MEMORY=3145728 ^
	-s MAXIMUM_MEMORY=3145728 ^
	-s TOTAL_STACK=1048576 ^
	-s SUPPORT_LONGJMP=0 ^
	-s MINIMAL_RUNTIME=0 ^
	-s ASSERTIONS=0 ^
	-s STACK_OVERFLOW_CHECK=0 ^
	-s EXPORT_NAME=CLib ^
	-s MODULARIZE=1 ^
	-s ENVIRONMENT='web,webview' ^
	-Os ^
	-DNDEBUG ^
	-o %LIB_DIR%\lib.js ^
	%SRCS%

MOVE %LIB_DIR%\lib.js %LIB_DIR%\lib-nowasm.js

CALL emcc ^
	-I%SRC_DIR% ^
	-s WASM=1 ^
	-s DYNAMIC_EXECUTION=0 ^
	-s EXPORTED_FUNCTIONS="['_allocBuffer', '_freeBuffer', '_fftSizeOf', '_fftInit', '_fftAlloc', '_fftFree', '_fftChangeN', '_fftSizeOff', '_fftInitf', '_fftAllocf', '_fftFreef', '_fftChangeNf', '_fft', '_ffti', '_fftf', '_fftif', '_graphicalFilterEditorAlloc', '_graphicalFilterEditorGetFilterKernelBuffer', '_graphicalFilterEditorGetChannelCurve', '_graphicalFilterEditorGetActualChannelCurve', '_graphicalFilterEditorGetVisibleFrequencies', '_graphicalFilterEditorGetEquivalentZones', '_graphicalFilterEditorGetEquivalentZonesFrequencyCount', '_graphicalFilterEditorUpdateFilter', '_graphicalFilterEditorUpdateActualChannelCurve', '_graphicalFilterEditorChangeFilterLength', '_graphicalFilterEditorFree', '_plainAnalyzer', '_waveletAnalyzer']" ^
	-s EXTRA_EXPORTED_RUNTIME_METHODS="[stackSave, stackAlloc, stackRestore]" ^
	-s ALLOW_MEMORY_GROWTH=0 ^
	-s INITIAL_MEMORY=3145728 ^
	-s MAXIMUM_MEMORY=3145728 ^
	-s TOTAL_STACK=1048576 ^
	-s SUPPORT_LONGJMP=0 ^
	-s MINIMAL_RUNTIME=0 ^
	-s ASSERTIONS=0 ^
	-s STACK_OVERFLOW_CHECK=0 ^
	-s EXPORT_NAME=CLib ^
	-s MODULARIZE=1 ^
	-s ENVIRONMENT='web,webview' ^
	-Os ^
	-DNDEBUG ^
	-o %LIB_DIR%\lib.js ^
	%SRCS%

cacls %LIB_DIR%\lib.js /E /P Todos:R
cacls %LIB_DIR%\lib.js.mem /E /P Todos:R
cacls %LIB_DIR%\lib.wasm /E /P Todos:R
cacls %LIB_DIR%\lib-nowasm.js /E /P Todos:R
