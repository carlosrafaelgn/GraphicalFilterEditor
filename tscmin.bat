@echo off

del assets\js\graphicalFilterEditor.min.js

call tsc

REM ECMASCRIPT_2015 and ES6 are the same thing...
REM https://www.typescriptlang.org/docs/handbook/compiler-options.html (--target section)
REM https://github.com/google/closure-compiler/wiki/Flags-and-Options

REM We are using ECMASCRIPT_2015 (without async/await support) in favor of a few old Android devices... (here and at tsconfig.json)
java -jar D:\Tools\closure-compiler.jar --js assets\js\graphicalFilterEditor.js --js_output_file assets\js\graphicalFilterEditor.min.js --language_in ECMASCRIPT_2015 --language_out ECMASCRIPT_2015 --strict_mode_input --compilation_level SIMPLE
REM java -jar D:\Tools\closure-compiler.jar --js assets\js\graphicalFilterEditor.js --js_output_file assets\js\graphicalFilterEditor.min.js --language_in ECMASCRIPT_2017 --language_out ECMASCRIPT_2017 --strict_mode_input --compilation_level SIMPLE

del assets\js\graphicalFilterEditor.js
