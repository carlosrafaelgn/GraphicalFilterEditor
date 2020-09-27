@echo off

del assets\js\graphicalFilterEditor.min.js

call tsc

move assets\js\graphicalFilterEditor.js assets\js\graphicalFilterEditor.min.js
