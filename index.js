
var Interpolate = require('./lib/interpolate.js');
var Parse = require('./lib/parse.js');
var Compile = require('./lib/compile.js');
var Scope = require('./lib/scope.js');
var htmlParser = require('htmlparser2');
var esprima = require('esprima');
var domSerializer = require('dom-serializer');

function parseHtml(htmlSrc) {
    var retError, retResult;
    var domHandler = new htmlParser.DomHandler(
        function (error, dom) {
            if (error) {
                retError = error;
            }
            else {
                retResult = dom;
            }
        }
    );
    var parser = new htmlParser.Parser(domHandler);
    parser.write(htmlSrc);
    parser.done();

    if (retError) {
        throw retError;
    }
    else {
        return retResult;
    }
}

function serializeHtml(dom) {
    return domSerializer(dom);
}

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
        htmlParser: parseHtml
    });

    return {
        compile: compile,
        parse: parse,
        interpolate: interpolate,
        serializeHtml: serializeHtml
    };
}

module.exports = thistle;
