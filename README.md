GraphicalFilterEditor
=====================

This is a test for a JavaScript graphical filter editor, based on my old C++ graphic equalizer.

With this editor you can graphically edit an equalizer filter and apply it to songs in real time. You can also apply the filter to an entire song and download a WAVE file with the filtered song. Check out the live sample on my website: http://carlosrafaelgn.com.br/GraphicalFilterEditor/

The code in index.html can be used as a demo on how to load and generate files during runtime in client-side JavaScript.

This project uses [Web Audio API][1], [File API][2] and [Web Worker API][3] and requires a [compliant browser][4] to run properly. In [Firefox 23 and 24][5], Web Audio API must be enabled using about:config.
[1]: http://www.w3.org/TR/webaudio/
[2]: http://www.w3.org/TR/FileAPI/
[3]: http://www.w3.org/TR/workers/
[4]: http://caniuse.com/audio-api
[5]: https://wiki.mozilla.org/WebAudio_API_Rollout_Status

If running this sample locally, Chrome must be started with the command-line option --allow-file-access-from-files otherwise you will not be able to load any files!

This projected is licensed under the terms of the FreeBSD License. See LICENSE.txt for more details.
