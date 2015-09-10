# fctx-compiler

Compiles SVN files into a binary format for use with the pebble-fctx drawing library.

Currently supports only the extraction of SVN font definitions.

A single SVG input file can generate multiple output files.  Each supported resource in the input is written as an output file into the resources directory.  Each output file is named with the id of the element from the input.

For example, the input file `fonts.svg` contains two font elements, one with `id="script-digits"` and the other with `id="letters-sans"`.  The fctx-compiler package has been added under the `tools/fctx-compiler` directory.  Run the following command:

`tools/fctx-compiler/fctx-compiler fonts.svg`

This will output two files: `resources/script-digits.ffont` and `resources/letter-sans`.
