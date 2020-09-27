GraphicalFilterEditor
=====================

This is a test for a JavaScript graphical filter editor, based on my old C++ graphic equalizer.

With this editor you can graphically edit an equalizer filter and apply it to songs in real time. You can also apply the filter to an entire song and download a WAVE file with the filtered song. Check out the live sample:

https://carlosrafaelgn.github.io/GraphicalFilterEditor/

https://carlosrafaelgn.com.br/GraphicalFilterEditor/

The code in index.html can be used as a demo on how to load and generate files during runtime in client-side JavaScript.

This project uses [Web Audio API][1], [File API][2] and [Web Worker API][3] and requires a [compliant browser][4] to run properly. In [Firefox 23 and 24][5], Web Audio API must be enabled using about:config.
[1]: http://www.w3.org/TR/webaudio/
[2]: http://www.w3.org/TR/FileAPI/
[3]: http://www.w3.org/TR/workers/
[4]: http://caniuse.com/audio-api
[5]: https://wiki.mozilla.org/WebAudio_API_Rollout_Status

If running this sample locally, Chrome must be started with the command-line option --allow-file-access-from-files otherwise you will not be able to load any files!

Run `tscdbg` or `tscmin` to compile the TypeScript files (requires tsc and closure-compiler), or run `make rebuild` to compile the C code (requires make and Emscripten). All build scripts target the Windows platform, and a few changes should be made to make them run under Linux or Mac.

This project is licensed under the [MIT License](https://github.com/carlosrafaelgn/GraphicalFilterEditor/blob/master/LICENSE.txt).

---

Notice for the FFT library

Reference:

* Masatake MORI, Makoto NATORI, Tatuo TORII: Suchikeisan, Iwanamikouzajyouhoukagaku18, Iwanami, 1982 (Japanese)

* Henri J. Nussbaumer: Fast Fourier Transform and Convolution Algorithms, Springer Verlag, 1982

* C. S. Burrus, Notes on the FFT (with large FFT paper list) http://www-dsp.rice.edu/research/fft/fftnote.asc

Copyright(C) 1996-2001 Takuya OOURA

email: ooura@mmm.t.u-tokyo.ac.jp

download: http://momonga.t.u-tokyo.ac.jp/~ooura/fft.html

You may use, copy, modify this code for any purpose and without fee. You may distribute this ORIGINAL package.

http://www.kurims.kyoto-u.ac.jp/~ooura/fft.html

https://www.jjj.de/fft/fftpage.html
