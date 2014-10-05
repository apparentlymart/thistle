
var Interpolate = require('./lib/interpolate.js');
var Parse = require('./lib/parse.js');
var Compile = require('./lib/compile.js');
var Scope = require('./lib/scope.js');
var cheerio = require('cheerio');
var esprima = require('esprima');

function thistle(opts) {
    opts = opts || {};
    var startSymbol = opts.interpolateStartSymbol;
    var endSymbol = opts.interpolateEndSymbol;
    var astBuilderFn = opts.astBuilder || Parse.esprimaAstBuilder(esprima);
    var filters = opts.filters;

    var parse = Parse({
        astBuilder: astBuilderFn,
        filters: filters
    });
    var interpolate = Interpolate({
        parse: parse,
        startSymbol: startSymbol,
        endSymbol: endSymbol
    });
    var compile = Compile({
        parse: parse,
        interpolate: interpolate,
        cheerio: cheerio.load('<html></html>')
    });

    return {
        compile: compile,
        parse: parse,
        interpolate: interpolate
    };
}

module.exports = thistle;
