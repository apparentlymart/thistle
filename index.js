
var Interpolate = require('./lib/interpolate.js');
var Parse = require('./lib/parse.js');
var Compile = require('./lib/compile.js');
var Scope = require('./lib/scope.js');
var DirectiveTypes = require('./lib/directivetypes.js');
var StandardDirectives = require('./lib/stddirectives.js');
var htmlParser = require('htmlparser2');
var cssSelect = require('CSSselect');
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

function compileCssSelector(selector) {
    return cssSelect.compile(selector);
}

function serializeHtml(dom) {
    return domSerializer(dom);
}

function thistle(opts) {
    opts = opts || {};
    var startSymbol = opts.interpolateStartSymbol;
    var endSymbol = opts.interpolateEndSymbol;
    var astBuilderFn = opts.astBuilder || Parse.esprimaAstBuilder(esprima);
    var addStandardDirectives = (
        typeof opts.standardDirectives !== 'undefined' ? (!!opts.standardDirectives) : true
    );
    var directives = [];
    var filters = {};

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
        htmlParser: parseHtml,
        directives: directives
    });
    var directiveTypes = DirectiveTypes({
        compile: compile,
        compileSelector: compileCssSelector
    });
    var standardDirectives = StandardDirectives({
        directiveTypes: directiveTypes,
        parse: parse,
        interpolate: interpolate
    });

    if (addStandardDirectives) {
        directives.push.apply(directives, standardDirectives);
    }

    return {
        compile: compile,
        parse: parse,
        interpolate: interpolate,
        serializeHtml: serializeHtml
        TemplateDirective: directiveTypes.TemplateDirective,
        ComponentDirective: directiveTypes.ComponentDirective,
        DecoratorDirective: directiveTypes.DecoratorDirective,
        standardDirectives: standardDirectives,
        addDirective: function addDirective(directive) {
            directives.push(directive);
        },
        addDirectives: function addDirectives(newDirectives) {
            directives.push.apply(directives, newDirectives);
        },
        addFilter: function addFilter(name, func) {
            filters[name] = func;
        },
        addFilters: function addFilters(map) {
            for (var k in map) {
                if (map.hasOwnProperty(k)) {
                    filters[k] = map[k];
                }
            }
        }
    };
}

module.exports = thistle;
