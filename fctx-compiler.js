#!/usr/bin/env node
/*jshint
    latedef: nofunc,
    node: true
*/
/*global
    require: false,
    console: false
*/

var _ = require('underscore'),
    fs = require('fs'),
    xml2js = require('xml2js'),
    pathParser = require('svg-path-parser'),
    argv = require('minimist')(process.argv.slice(2));

if (argv._.length !== 1) {
    console.log('Usage: svg-compiler <input>');
    return;
}
var filename = argv._[0],
    output = argv._[1];

require('colors');

console.log('\nSVG compiler for pebble-fctx'.bold.blue);
console.log('----------------------------\n'.bold.blue);

fs.readFile(filename, function (err, data) {
    'use strict';
    if (err) {
        console.log('failed to read %s because %s', filename, err);
        process.exit();
    }
    var parser = new xml2js.Parser({
        explicitArray: true,
        valueProcessors: [
            xml2js.processors.parseNumbers
        ]
    });
    parser.parseString(data, function (err, result) {
        var defs = result.svg.defs[0];

        _.each(defs.path, function (path) {
            console.log('path id %s', path.$.id);
            var packedPath = packPath(path),
                output = 'resources/' + path.$.id + '.fpath';
            fs.writeFile(output, packedPath, function (err) {
                if (err) throw err;
                console.log('Wrote %d bytes to %s', packedPath.length, output);
            });
        });

        _.each(defs.font, function (font) {
            console.log('font id %s', font.$.id);
            var packedFont = packFont(font),
                output = 'resources/' + font.$.id + '.ffont';
            fs.writeFile(output, packedFont, function (err) {
                if (err) throw err;
                console.log('Wrote %d bytes to %s', packedFont.length, output);
            });
        });

    });
});

function packPath(path) {
    /*jshint validthis: true */
    'use strict';
    var data = path.$.d || '',
        commands = pathParser(data),
        cursor = { emScale: 1, x: 0, y: 0, x0: 0, y0: 0 },
        packedCommands,
        packedPath;

    packedCommands = commands.map(packPathCommand, cursor);
    packedPath = Buffer.concat(packedCommands);

    return packedPath;
}

function packFont(font) {
    'use strict';
    var metadata = font['font-face'][0].$,
        glyphElements = font.glyph,
        unicodeRangePattern = /U\+([A-Fa-f0-9]+)-([A-Fa-f0-9]+)/,
        unicodeRange = unicodeRangePattern.exec(metadata['unicode-range']),
        packedFontHeader,
        packedGlyphTable,
        packedPaths,
        pathDataSize,
        packedPathData,
        packedFont;

    if (metadata['units-per-em'] > 72) {
        metadata.emScale = 72 / metadata['units-per-em'];
    } else {
        metadata.emScale = 1;
    }

    metadata.unicodeOffset = parseInt(unicodeRange[1], 16);
    metadata.glyphCount = parseInt(unicodeRange[2], 16) + 1 - metadata.unicodeOffset;
    packedFontHeader = packObject.call(metadata, metadata, 'UUFFF', ['glyphCount', 'unicodeOffset', 'units-per-em', 'ascent', 'descent']);

    packedPaths = glyphElements.map(packPathData, metadata);
    packedGlyphTable = new Buffer(6 * metadata.glyphCount);
    packedGlyphTable.fill(0);
    pathDataSize = glyphElements.reduce(function (offset, glyph, index) {
        var horizAdv = glyph.$['horiz-adv-x'] || font.$['horiz-adv-x'],
            unicode = glyph.$.unicode,
            charCode = unicode.charCodeAt(0),
            glyphIndex = charCode - metadata.unicodeOffset,
            pathData = packedPaths[index];

        console.log('glyph[%d] "%s" |%d| : %d + %d', glyphIndex, unicode, horizAdv, offset, pathData.length);
        packedGlyphTable.writeUIntLE(offset, 6 * glyphIndex, 2);
        packedGlyphTable.writeUIntLE(pathData.length, 6 * glyphIndex + 2, 2);
        horizAdv = Math.floor(horizAdv * metadata.emScale * 16 + 0.5);
        packedGlyphTable.writeUIntLE(horizAdv, 6 * glyphIndex + 4, 2);
        return offset + pathData.length;
    }, 0);

    console.log('packed path data size %d bytes', pathDataSize);
    packedPathData = Buffer.concat(packedPaths, pathDataSize);

    packedFont = Buffer.concat([packedFontHeader, packedGlyphTable, packedPathData]);
    console.log('packed font total size %d bytes', packedFont.length);
    return packedFont;
}

function packPathData(glyph, index, glyphs) {
    /*jshint validthis: true */
    'use strict';
    var metadata = this,
        data = glyph.$.d || '',
        commands = pathParser(data),
        cursor = { emScale: metadata.emScale, x: 0, y: 0, x0: 0, y0: 0 },
        packedCommands,
        packedPath;

    //console.log('"%s"  d="%s"', glyph.$.unicode, data);
    packedCommands = commands.map(packPathCommand, cursor);
    packedPath = Buffer.concat(packedCommands);

    return packedPath;
}

function packPathCommand(cmd, index, commands) {
    /*jshint validthis: true */
    'use strict';
    var cursor = this,
        buffer = null;

    if (cmd.command === 'moveto') {
        buffer = packObject.call(cursor, cmd, 'CXY', ['code', 'x', 'y']);
        cursor.x = cursor.x0 = cmd.x;
        cursor.y = cursor.y0 = cmd.y;

    } else if (cmd.command === 'closepath') {
        buffer = packObject.call(cursor, cmd, 'C', ['code']);
        cursor.x = cursor.x0;
        cursor.y = cursor.y0;

    } else if (cmd.command === 'lineto') {
        buffer = packObject.call(cursor, cmd, 'CXY', ['code', 'x', 'y']);
        cursor.x = cmd.x;
        cursor.y = cmd.y;

    } else if (cmd.command === 'horizontal lineto') {
        buffer = packObject.call(cursor, cmd, 'CX', ['code', 'x']);
        cursor.x = cmd.x;

    } else if (cmd.command === 'vertical lineto') {
        buffer = packObject.call(cursor, cmd, 'CY', ['code', 'y']);
        cursor.y = cmd.y;

    } else if (cmd.command === 'curveto') {
        buffer = packObject.call(cursor, cmd, 'CXYXYXY', ['code', 'x1', 'y1', 'x2', 'y2', 'x', 'y']);
        cursor.x = cmd.x;
        cursor.y = cmd.y;
        cursor.cpx = cmd.x2;
        cursor.cpy = cmd.y2;

    } else if (cmd.command === 'smooth curveto') {
        buffer = packObject.call(cursor, cmd, 'CXYXY', ['code', 'x2', 'y2', 'x', 'y']);
        cursor.x = cmd.x;
        cursor.y = cmd.y;

    } else if (cmd.command === 'quadratic curveto') {
        buffer = packObject.call(cursor, cmd, 'CXYXY', ['code', 'x1', 'y1', 'x', 'y']);
        cursor.x = cmd.x;
        cursor.y = cmd.y;

    } else if (cmd.command === 'smooth quadratic curveto') {
        buffer = packObject.call(cursor, cmd, 'CXY', ['code', 'x', 'y']);
        cursor.x = cmd.x;
        cursor.y = cmd.y;

    } else if (cmd.command === 'elliptical arc') {
        buffer = packArcTo.call(cursor, cmd);
    }
    return buffer;
}

function packObject(obj, format, keys) {
    /*jshint validthis: true*/
    'use strict';
    var cursor = this,
        sizes = {C:2, X:2, Y:2, F:2, U:2},
        fixedPointScale = 16,
        fmtCodes = format.split(''),
        bufferSize = fmtCodes.reduce(function (size, fmt) {
            return size + sizes[fmt];
        }, 0),
        buffer = new Buffer(bufferSize),
        debug = '    ';

    keys.reduce(function (offset, key, index) {
        var fmt = format[index],
            val = obj[key],
            size = sizes[fmt];
        if (fmt === 'C') {
            debug += val.toUpperCase();
            val = val.toUpperCase().charCodeAt(0);
            buffer.writeIntLE(val, offset, size);
        } else if (fmt === 'U') {
            debug += ' ' + val;
            buffer.writeUIntLE(val, offset, size);
        } else {
            if (obj.relative) {
                if (fmt === 'X') {
                    val += cursor.x;
                    obj[key] = val;
                } else if (fmt === 'Y') {
                    val += cursor.y;
                    obj[key] = val;
                }
            }
            debug += ' ' + val;
            val = Math.floor(val * cursor.emScale * fixedPointScale + 0.5);
            buffer.writeIntLE(val, offset, size);
        }
        return offset + size;
    }, 0);

    //console.log(debug);
    return buffer;
}

function packArcTo(cmd) {
    var cursor = this,
        TAU = 2 * Math.PI;

    /* For reference, see the SVG Specification, Appendix F: Implementation Requirements
     * Section F.6 Elliptical arc implementation.
     * http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
     */

    /*
     * F.6.2 - Out-of-range parameters.
     */

    /* If the endpoints (x1, y1) and (x2, y2) are identical, then this is
     * equivalent to omitting the elliptical arc segment entirely.
     */
    if (cursor.x === cmd.x && cursor.y === cmd.y) {
        return;
    }

    /* If rx = 0 or ry = 0 then this arc is treated as a straight line segment
     * (a "lineto") joining the endpoints.
     */
    if (cmd.rx === 0 || cmd.ry === 0) {
        cmd.code = 'L';
        return packObject.call(cursor, cmd, 'CXY', ['code', 'x', 'y']);
    }

    /* If rx or ry have negative signs, these are dropped;
     * the absolute value is used instead.
     */
    var rx = Math.abs(cmd.rx);
    var ry = Math.abs(cmd.ry);

    /* If rx, ry and φ are such that there is no solution (basically, the
     * ellipse is not big enough to reach from (x1, y1) to (x2, y2)) then the
     * ellipse is scaled up uniformly until there is exactly one solution
     * (until the ellipse is just big enough).
     * This requirement will be handled below, where we are doing the relevant math.
     */

    /* φ is taken mod 360 degrees. */
    var phi = (cmd.xAxisRotation % 360) * TAU / 360;
    var cosPhi = Math.cos(phi);
    var sinPhi = Math.sin(phi);

    /*
     * Section F.6.5 - Conversion from endpoint to center parameterization
     */

    /* Step 1 : Compute (x1', y1') - the transformed start point [F.6.5.1] */

    var dx2 = (cursor.x - cmd.x) / 2.0;
    var dy2 = (cursor.y - cmd.y) / 2.0;
    var x1 =  cosPhi * dx2 + sinPhi * dy2;
    var y1 = -sinPhi * dx2 + cosPhi * dy2;

    /* Step 2 : Compute (cx', cy') [F.6.5.2] */

    var rx_sq = rx * rx;
    var ry_sq = ry * ry;
    var x1_sq = x1 * x1;
    var y1_sq = y1 * y1;

    /* Here is where we handle out-of-range ellipse radii, as described above.  See F.6.6 */
    var radiiCheck = x1_sq / rx_sq + y1_sq / ry_sq;
    if (radiiCheck > 1) {
        rx = Math.sqrt(radiiCheck) * rx;
        ry = Math.sqrt(radiiCheck) * ry;
        rx_sq = rx * rx;
        ry_sq = ry * ry;
    }

    var sign = (cmd.largeArc === cmd.sweep) ? -1 : 1;
    var sq = ((rx_sq * ry_sq) - (rx_sq * y1_sq) - (ry_sq * x1_sq)) / ((rx_sq * y1_sq) + (ry_sq * x1_sq));
    sq = (sq < 0) ? 0 : sq;
    var coef = sign * Math.sqrt(sq);
    var cx1 = coef *  ((rx * y1) / ry);
    var cy1 = coef * -((ry * x1) / rx);

    /* Step 3 : Compute (cx, cy) from (cx', cy') [F.6.5.3] */

    var sx2 = (cursor.x + cmd.x) / 2.0;
    var sy2 = (cursor.y + cmd.y) / 2.0;
    var cx = sx2 + (cosPhi * cx1 - sinPhi * cy1);
    var cy = sy2 + (sinPhi * cx1 + cosPhi * cy1);

    /* Step 4 : Compute the angleStart and the angleExtent */

    /* F.6.5.4 */
    var ux = (x1 - cx1) / rx;
    var uy = (y1 - cy1) / ry;
    var vx = (-x1 - cx1) / rx;
    var vy = (-y1 - cy1) / ry;

    /* F.6.5.5 */
    var n = Math.sqrt((ux * ux) + (uy * uy));
    var p = ux; // (1 * ux) + (0 * uy)
    sign = (uy < 0) ? -1.0 : 1.0;
    var angleStart = sign * Math.acos(p / n);

    /* F.6.5.6 */
    n = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
    p = ux * vx + uy * vy;
    sign = (ux * vy - uy * vx < 0) ? -1.0 : 1.0;
    var angleExtent = sign * Math.acos(p / n);
    if (!cmd.sweep && angleExtent > 0) {
        angleExtent -= TAU;
    } else if (cmd.sweep && angleExtent < 0) {
        angleExtent += TAU;
    }
    angleExtent %= TAU;
    angleStart %= TAU;

    /* Now that we have re-parameterized the elliptical arc into a normalized
     * circular arc, we can calculate a poly-bezier that approximates the
     * normalized circular arc.
     */
    var beziers = arcToBeziers(angleStart, angleExtent);

    /* And finally, we transform the poly-bezier approximation of the normalized
     * circular arc such that it becomes an approximation of the original
     * elliptical arc.
     * Scale by the ellipse radii, rotate by the ellipse angle, translate by the ellipse center.
     */
    var transform = function (o, xp, yp) {
        var x = (o[xp] * rx * cosPhi - o[yp] * ry * sinPhi) + cx;
        var y = (o[xp] * rx * sinPhi + o[yp] * ry * cosPhi) + cy;
        o[xp] = x;
        o[yp] = y;
    };
    beziers.forEach(function (cmd) {
        transform(cmd, 'x', 'y');
        transform(cmd, 'x1', 'y1');
        transform(cmd, 'x2', 'y2');
    });

    /* Overwrite the final point of the poly-bezier to make sure it is exactly the point originally
     * specified by the 'arcTo' command.
     */
    beziers[beziers.length-1].x = cmd.x;
    beziers[beziers.length-1].y = cmd.y;

    /* Pack the 'curveTo' commands. */
    var buffers = [];
    beziers.forEach(function (cmd) {
        buffers.push(packObject.call(cursor, cmd, 'CXYXYXY', ['code', 'x1', 'y1', 'x2', 'y2', 'x', 'y']));
        cursor.x = cmd.x;
        cursor.y = cmd.y;
        cursor.cpx = cmd.x2;
        cursor.cpy = cmd.y2;
    });

    var buffer = Buffer.concat(buffers);
    return buffer;
}


/*
* Generate the control points and endpoints for a set of bezier curves that match
* a circular arc starting from angle 'angleStart' and sweep the angle 'angleExtent'.
* The circle the arc follows will be centred on (0,0) and have a radius of 1.0.
*
* Each bezier can cover no more than 90 degrees, so the arc will be divided evenly
* into a maximum of four curves.
*
* The resulting control points will later be scaled and rotated to match the final
* arc required.
*
* The returned array has the format [x0,y0, x1,y1,...] and excludes the start point
* of the arc.
*/
function arcToBeziers(angleStart, angleExtent) {
   var numSegments = Math.ceil(Math.abs(angleExtent) / 90.0);

   var angleIncrement = (angleExtent / numSegments);

  // The length of each control point vector is given by the following formula.
  var controlLength = 4.0 / 3.0 * Math.sin(angleIncrement / 2.0) / (1.0 + Math.cos(angleIncrement / 2.0));

  var commands = [];

  for (var i = 0; i < numSegments; i++) {
      var cmd = { command: 'curveTo', code: 'C' };
      var angle = angleStart + i * angleIncrement;
      // Calculate the control vector at this angle
      var dx = Math.cos(angle);
      var dy = Math.sin(angle);
      // First control point
      cmd.x1 = (dx - controlLength * dy);
      cmd.y1 = (dy + controlLength * dx);
      // Second control point
      angle += angleIncrement;
      dx = Math.cos(angle);
      dy = Math.sin(angle);
      cmd.x2 = (dx + controlLength * dy);
      cmd.y2 = (dy - controlLength * dx);
      // Endpoint of bezier
      cmd.x = dx;
      cmd.y = dy;
      commands.push(cmd);
  }
  return commands;
}
