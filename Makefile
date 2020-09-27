LIB_DIR=lib
SRC_DIR=$(LIB_DIR)/src

SRCS=\
	$(SRC_DIR)/fft4g.c \
	$(SRC_DIR)/fft4gf.c \
	$(SRC_DIR)/graphicalFilterEditor.c \
	$(SRC_DIR)/plainAnalyzer.c \
	$(SRC_DIR)/waveletAnalyzer.c

all: $(LIB_DIR)/lib.js

# General options: https://emscripten.org/docs/tools_reference/emcc.html
# -s flags: https://github.com/emscripten-core/emscripten/blob/master/src/settings.js
#
# Extra:
# https://emscripten.org/docs/porting/Debugging.html
# https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#interacting-with-code-ccall-cwrap
# -s EXTRA_EXPORTED_RUNTIME_METHODS=['cwrap']
#
# Debugging:
# https://emscripten.org/docs/porting/Debugging.html#debugging-debug-information-g
# https://emscripten.org/docs/tools_reference/emcc.html
# -s ASSERTIONS=2
# -s STACK_OVERFLOW_CHECK=2
# -g4
# --source-map-base '/GraphicalFilterEditor/'
#
# As of August 2020, WASM=2 does not work properly, even if loading the correct file
# manually during runtime... That's why I'm compiling it twice...
#
# 8388608 bytes (2097152 stack + 6291456 heap) is enough to hold even the largest
# structure, ImageInfo, which has a total of 4719244 bytes.

$(LIB_DIR)/lib.js: $(SRCS)
	emcc \
	-I$(SRC_DIR) \
	-s WASM=0 \
	-s PRECISE_F32=0 \
	-s DYNAMIC_EXECUTION=0 \
	-s EXPORTED_FUNCTIONS='["_allocBuffer", "_freeBuffer", "_fftSizeOf", "_fftInit", "_fftAlloc", "_fftFree", "_fftChangeN", "_fftSizeOff", "_fftInitf", "_fftAllocf", "_fftFreef", "_fftChangeNf", "_fft", "_ffti", "_fftf", "_fftif", "_graphicalFilterEditorAlloc", "_graphicalFilterEditorGetFilterKernelBuffer", "_graphicalFilterEditorGetChannelCurve", "_graphicalFilterEditorGetActualChannelCurve", "_graphicalFilterEditorGetVisibleFrequencies", "_graphicalFilterEditorGetEquivalentZones", "_graphicalFilterEditorGetEquivalentZonesFrequencyCount", "_graphicalFilterEditorUpdateFilter", "_graphicalFilterEditorUpdateActualChannelCurve", "_graphicalFilterEditorChangeFilterLength", "_graphicalFilterEditorFree", "_plainAnalyzer", "_waveletAnalyzer"]' \
	-s EXTRA_EXPORTED_RUNTIME_METHODS='["stackSave", "stackAlloc", "stackRestore"]' \
	-s ALLOW_MEMORY_GROWTH=0 \
	-s INITIAL_MEMORY=3145728 \
	-s MAXIMUM_MEMORY=3145728 \
	-s TOTAL_STACK=1048576 \
	-s SUPPORT_LONGJMP=0 \
	-s MINIMAL_RUNTIME=0 \
	-s ASSERTIONS=0 \
	-s STACK_OVERFLOW_CHECK=0 \
	-s EXPORT_NAME=CLib \
	-s MODULARIZE=1 \
	-s ENVIRONMENT='web,webview' \
	-Os \
	-DNDEBUG \
	-o $@ \
	$(SRCS)

	move $(LIB_DIR)\lib.js $(LIB_DIR)\lib-nowasm.js

	emcc \
	-I$(SRC_DIR) \
	-s WASM=1 \
	-s DYNAMIC_EXECUTION=0 \
	-s EXPORTED_FUNCTIONS='["_allocBuffer", "_freeBuffer", "_fftSizeOf", "_fftInit", "_fftAlloc", "_fftFree", "_fftChangeN", "_fftSizeOff", "_fftInitf", "_fftAllocf", "_fftFreef", "_fftChangeNf", "_fft", "_ffti", "_fftf", "_fftif", "_graphicalFilterEditorAlloc", "_graphicalFilterEditorGetFilterKernelBuffer", "_graphicalFilterEditorGetChannelCurve", "_graphicalFilterEditorGetActualChannelCurve", "_graphicalFilterEditorGetVisibleFrequencies", "_graphicalFilterEditorGetEquivalentZones", "_graphicalFilterEditorGetEquivalentZonesFrequencyCount", "_graphicalFilterEditorUpdateFilter", "_graphicalFilterEditorUpdateActualChannelCurve", "_graphicalFilterEditorChangeFilterLength", "_graphicalFilterEditorFree", "_plainAnalyzer", "_waveletAnalyzer"]' \
	-s EXTRA_EXPORTED_RUNTIME_METHODS='["stackSave", "stackAlloc", "stackRestore"]' \
	-s ALLOW_MEMORY_GROWTH=0 \
	-s INITIAL_MEMORY=3145728 \
	-s MAXIMUM_MEMORY=3145728 \
	-s TOTAL_STACK=1048576 \
	-s SUPPORT_LONGJMP=0 \
	-s MINIMAL_RUNTIME=0 \
	-s ASSERTIONS=0 \
	-s STACK_OVERFLOW_CHECK=0 \
	-s EXPORT_NAME=CLib \
	-s MODULARIZE=1 \
	-s ENVIRONMENT='web,webview' \
	-Os \
	-DNDEBUG \
	-o $@ \
	$(SRCS)

	cacls $(LIB_DIR)\lib.js /E /P Todos:R
	cacls $(LIB_DIR)\lib.js.mem /E /P Todos:R
	cacls $(LIB_DIR)\lib.wasm /E /P Todos:R
	cacls $(LIB_DIR)\lib-nowasm.js /E /P Todos:R

# Windows
clean:
	del $(LIB_DIR)\lib.js
	del $(LIB_DIR)\lib.js.mem
	del $(LIB_DIR)\lib.wasm
	del $(LIB_DIR)\lib-nowasm.js

rebuild:
	$(MAKE) clean
	$(MAKE) all
