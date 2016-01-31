# fctx-compiler

Compiles SVN files into a binary format for use with the pebble-fctx drawing library.

Supports the extraction of SVN font definitions and individual paths.

[FontForge](https://fontforge.github.io/en-US/) is recommended for preparing
SVG fonts.

In the `tools/fctx-compiler` directory, run `npm update` to install the local node
package dependencies.

A single SVG input file can generate multiple output files.  Each supported resource in the input is written as an output file into the resources directory.  Each output file is named with the id of the element from the input.

For example, the input file `resources.svg` contains, within the `<defs>`
element, a `<font>` element with `id="digits"` and a `<path>` element `id="icon"`.
The fctx-compiler package has been added under the `tools/fctx-compiler` directory.
Run the following command:

`tools/fctx-compiler/fctx-compiler resources.svg`

This will output two files: `resources/digits.ffont` and `resources/icon.fpath`.
