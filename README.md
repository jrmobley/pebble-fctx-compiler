# pebble-fctx-compiler

Compiles SVG files into a binary format for use with the pebble-fctx drawing library.

    npm install pebble-fctx-compiler --save-dev

Supports the extraction of SVG font definitions and individual paths.

[FontForge](https://fontforge.github.io/en-US/) is recommended for preparing SVG fonts.

A single SVG input file can generate multiple output files.  Each supported resource in the input is written as an output file into the resources directory.  Each output file is named with the id of the element from the input.

For example, if the input file `resources.svg` contains, within the `<defs>` element, a `<font>` element with `id="digits"` and a `<path>` element `id="icon"`, then the command

    ./node_modules/.bin/fctx-compiler resources.svg`

will output two files: `resources/digits.ffont` and `resources/icon.fpath`.
