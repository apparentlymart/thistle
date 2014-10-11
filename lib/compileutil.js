
/**
 * Combines multiple link functions into a single link function.
 *
 * @param {function[]} funcs Array of link functions to combine.
 */
function combineLinkFuncs(funcs) {
    // We produce a function with a hard-coded sequence of direct calls
    // since that presents the best opportunity for the optimizer to
    // inline the function bodies for faster execution.

    // We detect if any of the functions we've been passed are the
    // result of other calls to this function, and if so we flatten
    // the list to reduce the number of recursive calls.
    var flattenedFuncs = [];
    for (var i = 0; i < funcs.length; i++) {
        var func = funcs[i];
        if (func.combinedFunctions) {
            flattenedFuncs.push.apply(flattenedFuncs, func.combinedFunctions);
        }
        else {
            flattenedFuncs.push(func);
        }
    }

    var calls = flattenedFuncs.map(
        function (func, index) {
            return 'func' + index + '(scope, nodes);';
        }
    );
    var paramNames = flattenedFuncs.map(
        function (func, index) {
            return 'func' + index;
        }
    );

    var builderSrc = 'return function combinedLink(scope, nodes) {' + calls.join('') + '};';
    var args = paramNames.concat([builderSrc]);
    var builder = Function.apply(null, args);
    var result = builder.apply(null, flattenedFuncs);
    result.combinedFunctions = flattenedFuncs;
    return result;
}

/**
 * Creates a function that takes some arguments and returns a copy of the
 * provided object with the arguments substituted into it.
 *
 * @param {object} obj JSON-friendly object, extended with {@link VarRef} instances for dynamic data.
 * @param {string[]} params List of parameter names for the function. Must include all vars from the template.
 */
function makeObjTemplateFunc(obj, params) {
    params = params || [];
    var impl = 'return (\n' + encodeJsonWithVars(obj) + '\n)';
    var args = params.concat(impl);
    return Function.apply(null, args);
}

/**
 * Represents a reference to a variable in an object template.
 *
 * @constructor
 * @param {string} varName The variable name to reference. Must be a valid JavaScript identifier.
 */
function VarRef(varName) {
    this.varName = varName;
}

function encodeJsonWithVarsPart(val, parts) {
    // What we're producing here is actually a JSON extension
    // where we can have references to scope variables. That
    // means we need to do all of the JSON encoding manually,
    // since the built in JSON support is not extensible
    // enough to handle this extension.
    var idx;

    switch (typeof val) {
        case 'string':
        case 'number':
        case 'boolean': {
            parts.push(JSON.stringify(val));
        } break;

        case 'undefined': {
            parts.push('undefined');
        } break;

        case 'object': {
            if (val === null) {
                parts.push('null');
                return;
            }

            switch (val.constructor) {
                case Array: {
                    parts.push('[');
                    idx = 0;
                    val.map(function (item) {
                        if (idx++ > 0) {
                            parts.push(',');
                        }
                        encodeJsonWithVarsPart(item, parts);
                    });
                    parts.push(']');
                } break;

                case VarRef: {
                    parts.push(val.varName);
                } break;

                default: {
                    parts.push('{');
                    idx = 0;
                    for (var k in val) {
                        if (idx++ > 0) {
                            parts.push(',');
                        }
                        if (val.hasOwnProperty(k)) {
                            encodeJsonWithVarsPart(k, parts);
                            parts.push(':');
                            encodeJsonWithVarsPart(val[k], parts);
                        }
                    }
                    parts.push('}');
                } break;
            }
        } break;
    }
}

function encodeJsonWithVars(obj) {
    var parts = [];
    encodeJsonWithVarsPart(obj, parts);
    return parts.join('');
}

module.exports = {
    combineLinkFuncs: combineLinkFuncs,
    makeObjTemplateFunc: makeObjTemplateFunc,
    encodeJsonWithVars: encodeJsonWithVars,
    VarRef: VarRef
};
