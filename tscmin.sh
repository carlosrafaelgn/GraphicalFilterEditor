tsc

# ECMASCRIPT_2015 and ES6 are the same thing...
# https://www.typescriptlang.org/docs/handbook/compiler-options.html (--target section)
# https://github.com/google/closure-compiler/wiki/Flags-and-Options

# We are using ECMASCRIPT_2015 (without async/await support) in favor of a few old Android devices... (here and at tsconfig.json)
java -jar /d/Tools/closure-compiler.jar --js assets/js/graphicalFilterEditor.js --js_output_file assets/js/graphicalFilterEditor.min.js --language_in ECMASCRIPT_2015 --language_out ECMASCRIPT_2015 --strict_mode_input --compilation_level SIMPLE
# java -jar /d/Tools/closure-compiler.jar --js assets/js/graphicalFilterEditor.js --js_output_file assets/js/graphicalFilterEditor.min.js --language_in ECMASCRIPT_2017 --language_out ECMASCRIPT_2017 --strict_mode_input --compilation_level SIMPLE

rm assets/js/graphicalFilterEditor.js
