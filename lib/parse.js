
var util = require('util');

function ParseError(message) {
    Error.call(this);
    this.message = message;
}
util.inherits(ParseError, Error);

function compileExpr(rootNode, filters) {
    var neededFilters = {};
    var parts = [];

    function nodeToJs(node) {
        var i;

        switch (node.type) {
            case 'Literal': {
                parts.push(node.raw);
            } break;

            case 'Identifier': {
                parts.push('scope.');
                parts.push(node.name);
            } break;

            case 'BinaryExpression': {
                if (node.operator === '|') {
                    // JavaScript considers this as bitwise OR but we treat it
                    // as filter application instead.
                    var filterName;
                    var filterArgs;
                    if (node.right.type == 'CallExpression') {
                        if (node.right.callee.type == 'Identifier') {
                            filterName = node.right.callee.name;
                            filterArgs = node.right.arguments;
                        }
                        else {
                            throw new ParseError('Filter name must be identifier');
                        }
                    }
                    else if (node.right.type == 'Identifier') {
                        filterName = node.right.name;
                        filterArgs = [];
                    }
                    else {
                        throw new ParseError('Right operand of | must be filter call');
                    }

                    if (! filters[filterName]) {
                        throw new ParseError('Unknown filter "' + filterName + '"');
                    }
                    neededFilters[filterName] = true;
                    parts.push(filterName);
                    parts.push('Filter(');
                    for (i = 0; i < filterArgs.length; i++) {
                        if (i > 0) {
                            parts.push(',');
                        }
                        nodeToJs(filterArgs[i]);
                    }
                    parts.push(')');
                    parts.push('(');
                    nodeToJs(node.left);
                    parts.push(')');

                }
                else {
                    parts.push('(');
                    nodeToJs(node.left);
                    parts.push(node.operator);
                    nodeToJs(node.right);
                    parts.push(')');
                }
            } break;

            case 'UnaryExpression': {
                parts.push('(');
                if (node.prefix) {
                    parts.push(node.operator);
                }
                nodeToJs(node.argument);
                if (! node.prefix) {
                    parts.push(node.operator);
                }
                parts.push(')');
            } break;

            case 'MemberExpression': {
                parts.push('(');
                nodeToJs(node.object);
                if (node.computed) {
                    parts.push('[');
                    nodeToJs(node.property);
                    parts.push(']');
                }
                else {
                    // assume node.property is an identifier, then
                    parts.push('.');
                    parts.push(node.property.name);
                }
                parts.push(')');
            } break;

            case 'CallExpression': {
                nodeToJs(node.callee);
                parts.push('(');
                for (i = 0; i < node.arguments.length; i++) {
                    if (i > 0) {
                        parts.push(',');
                    }
                    nodeToJs(node.arguments[i]);
                }
                parts.push(')');
            } break;

            case 'ArrayExpression': {
                parts.push('[');
                for (i = 0; i < node.elements.length; i++) {
                    if (i > 0) {
                        parts.push(',');
                    }
                    nodeToJs(node.elements[i]);
                }
                parts.push(']');
            } break;

            case 'ObjectExpression': {
                parts.push('{');
                for (i = 0; i < node.properties.length; i++) {
                    if (i > 0) {
                        parts.push(',');
                    }
                    var property = node.properties[i];
                    if (property.key.type === 'Identifier') {
                        // Need to handle this as a special case so we don't prefix it with "scope."
                        parts.push(property.key.name);
                    }
                    else {
                        nodeToJs(property.key);
                    }
                    parts.push(':');
                    nodeToJs(property.value);
                }
                parts.push('}');
            } break;

            default: {
                throw new ParseError('Expression may not contain ' + node.type);
            } break;
        }

    }

    nodeToJs(rootNode);

    var funcParts = [];

    funcParts.push('return function linkExpr(scope) { return (\n');
    funcParts.push(parts.join(''));
    funcParts.push('\n); };');

    // Filters are passed as local variables into the function builder
    // so that they can be bound at expression compile time and then
    // called at link time.
    var functionConsArgs = [];
    var filterArgs = [];
    for (var filterName in neededFilters) {
        functionConsArgs.push(filterName + 'Filter');
        filterArgs.push(filters[filterName]);
    }
    functionConsArgs.push(funcParts.join(''));

    return Function.apply(Function, functionConsArgs).apply(undefined, filterArgs);
}

function Parse(opts) {
    var astBuilderFn = opts.astBuilder;
    var filters = opts.filters || {};
    return function parse(exprStr) {
        var ast = astBuilderFn(exprStr);
        return compileExpr(ast, filters);
    }
}
Parse.esprimaAstBuilder = function esprimaAstBuilder(esprima) {
    return function buildAst(exprStr) {
        var root;
        try {
            root = esprima.parse('(\n' + exprStr + '\n)');
        }
        catch (e) {
            throw new ParseError(e.message);
        }

        if (root.body.length != 1) {
            throw new ParseError('Must provide exactly one expression');
        }
        var statement = root.body[0];
        if (statement.type != 'ExpressionStatement') {
            throw new ParseError('Must provide Expression, not ' + statement.type);
        }
        return statement.expression;
    }
}
Parse.ParseError = ParseError;

module.exports = Parse;
