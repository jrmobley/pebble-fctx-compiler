# pebble-fctx-compiler

Compiles SVG resources into a binary format for use with the [pebble-fctx](https://www.npmjs.com/package/pebble-fctx) drawing library.

### Release notes

##### v1.2
* Added cap-height to the font metadata.  Compatible with [pebble-fctx](https://www.npmjs.com/package/pebble-fctx) version 1.6.

### Installation and usage

To install as a local `devDependency` within your pebble project:

    npm install pebble-fctx-compiler --save-dev

And then the invoke the locally installed compiler:

    ./node_modules/.bin/fctx-compiler <path-to/your-file.svg> [-r <regex>]

The compiler only looks for elements defined within the `<defs>` section of the SVG.  It can handle `<font>` elements and `<g d="...">` elements.  All output is written to the `resources` folder and the output files are named according to the `id` property of the element.

For example, an SVG font definition `<defs><font id="OpenSans-Regular"...> ... </font></defs>` will be output to `resources/OpenSans-regular.ffont`.

And an SVG path element defined as `<defs><g id="hour-hand" d="..."> ... </g></defs>` will be output to `resources/hour-hand.fpath`.

### Example workflow for converting a subset of glyphs from a font.

1. Open the font in [FontForge](https://fontforge.github.io/en-US/).
2. Select `File -> Generate Fonts...`, then select `SVG Font` as the output format, and finally click `Generate` to convert the font.
3. Open the SVG file in your favorite code or text editor to double check the `id` of the font and to do any formatting cleanup you like.
4. Invoke `fctx-compiler` with the `-r [0-9:AMP]` option to compile glyph data for just the digits 0 through 9, the colon, and the letters A, M and P.
