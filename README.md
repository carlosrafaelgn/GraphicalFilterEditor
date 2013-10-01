GraphicalFilterEditor
=====================

This is a test for a JavaScript graphical filter editor, based on my old C++ graphic equalizer.

With this editor you can graphicaly edit an equalizer filter and apply it to songs in real time. You can also apply the filter to an entire song and download a WAVE file with the filtered song. Check out the live sample on my website: http://carlosrafaelgn.com.br/GraphicalFilterEditor/

The code in index.html can be used as a demo on how to load and generate files during runtime in client-side JavaScript.

This project uses both Web Audio API and File API and requires the latest version of Chrome to run properly (or other compliant browser).

If running this sample locally, Chrome must be started with the command-line option --allow-file-access-from-files otherwise you will not be able to load any files!
