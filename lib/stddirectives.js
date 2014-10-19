
var compileUtil = require('./compileutil.js');

function StandardDirectives(opts) {
    var directiveTypes = opts.directiveTypes;
    var parse = opts.parse;
    var interpolate = opts.interpolate;

    var thiIf = new directiveTypes.TemplateDirective({
        selector: '[thi-if]',
        compile: function compileThiIf(tAttrs) {
            var expr = tAttrs['thi-if'];
            var testFn = parse(expr);
            delete tAttrs['thi-if'];

            return function linkThiIf(scope, appendInstance) {
                if (testFn(scope)) {
                    appendInstance(scope);
                }
            };
        }
    });

    var thiRepeat = new directiveTypes.TemplateDirective({
        selector: '[thi-repeat]',
        compile: function compileThiRepeat(tAttrs) {
            var def = tAttrs['thi-repeat'];
            delete tAttrs['thi-repeat'];
            var match = def.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/);

            if (! match) {
                throw new Error(
                    'ng-repeat expects definition like \'_item_\' in \'_collection_\' ' +
                    'but got \'' + def + '\''
                );
            }

            var assigneeDef = match[1];
            var expr = match[2];

            match = assigneeDef.match(/^(?:([\$\w]+)|\(([\$\w]+)\s*,\s*([\$\w]+)\))$/);
            if (! match) {
                throw new Error(
                    'ng-repeat expects either identifier or (_key_, _value_) expression, but got \'' +
                    assigneeDef + '\''
                );
            }

            var valueIdentifier = match[3] || match[1];
            var keyIdentifier = match[2];

            var valueFn = parse(expr);
            var propertyDef = { writable: true };
            var scopeProperties = {
                $index: propertyDef,
                $first: propertyDef,
                $middle: propertyDef,
                $last: propertyDef,
                $even: propertyDef,
                $odd: propertyDef
            };
            scopeProperties[valueIdentifier] = propertyDef;
            if (keyIdentifier) {
                scopeProperties[keyIdentifier] = propertyDef;
            }

            var updateScopeForIteration;
            var updateValue = new Function('scope', 'value', 'scope.' + valueIdentifier + ' = value;');
            function updateIterationVars(scope, index, lastIndex) {
                scope.$index = index;
                scope.$first = (index === 0);
                scope.$last = index === lastIndex;
                scope.$middle = !(scope.$first || scope.$last);
                // jshint: bitwise: false
                scope.$odd = !(scope.$even = (index & 1) === 0);
                // jshint: bitwise: true
            }

            if (keyIdentifier) {
                var updateKey = new Function('scope', 'key', 'scope.' + keyIdentifier + ' = key;');
                updateScopeForIteration = function updateScopeWithKey(scope, key, value, index, lastIndex) {
                    updateKey(scope, key);
                    updateValue(scope, value);
                    updateIterationVars(scope, index, lastIndex);
                };
            }
            else {
                updateScopeForIteration = function updateScopeWithoutKey(scope, key, value, index, lastIndex) {
                    updateValue(scope, value);
                    updateIterationVars(scope, index, lastIndex);
                };
            }

            function linkArrayRepeat(childScope, appendInstance, arr) {
                var length = arr.length;
                var lastIndex = length - 1;
                for (var i = 0; i < length; i++) {
                    updateScopeForIteration(childScope, i, arr[i], i, lastIndex);
                    appendInstance(childScope);
                }
            }

            function linkObjectRepeat(childScope, appendInstance, obj) {
                var keys = Object.keys(obj);
                var length = keys.length;
                var lastIndex = length - 1;
                for (var i = 0; i < length; i++) {
                    var key = keys[i];
                    updateScopeForIteration(childScope, key, obj[key], i, lastIndex);
                    appendInstance(childScope);
                }
            }

            return function linkThiRepeat(scope, appendInstance) {
                var value = valueFn(scope);

                if (typeof value === 'undefined') {
                    return;
                }

                // Create a child scope that inherits the parent scope.
                var childScope = Object.create(scope, scopeProperties);

                if (value.constructor === Array) {
                    linkArrayRepeat(childScope, appendInstance, value);
                }
                else {
                    linkObjectRepeat(childScope, appendInstance, value);
                }
            };
        }
    });

    var thiSwitch = new directiveTypes.DecoratorDirective({
        selector: '[thi-switch]',
        compile: function (tElementName, tAttrs, context) {
            var expr = tAttrs['thi-switch'];
            var valueFn = parse(expr);
            delete tAttrs['thi-switch'];

            var cases = {};
            var nextCaseIdx = 1;
            var caseStack = [];
            var activeCase;

            function defaultCaseFunction() {
                return activeCase === 0;
            };

            var service = {
                registerWhen: function registerWhen(exprFn) {
                    var value;
                    try {
                        // We try to evaluate the expr function with a null scope,
                        // which will cause it to fail if it refers to any scope
                        // variables. This is desirable since we want all of the
                        // cases to be constants.
                        value = exprFn(null);
                    }
                    catch (err) {
                        throw new Error('thi-switch-when expression must be constant');
                    }
                    var valueSrc = JSON.stringify(value);

                    if (! cases[valueSrc]) {
                        cases[valueSrc] = nextCaseIdx++;
                    }
                    var caseIdx = cases[valueSrc];

                    return function testWhenCase() {
                        return activeCase === caseIdx;
                    };
                },
                registerElse: function registerElse() {
                    return defaultCaseFunction;
                }
            };

            context.addService('thiSwitch', service);

            var testFn;
            context.onFinalize(function () {
                var testFnParts = ['switch (value) {\n'];
                for (var valueSrc in cases) {
                    if (cases.hasOwnProperty(valueSrc)) {
                        var caseIdx = cases[valueSrc];
                        testFnParts.push('    case ' + valueSrc + ': return ' + caseIdx + ';\n');
                    }
                }
                testFnParts.push('    default: return 0;\n}\n');
                testFn = new Function('value', testFnParts.join(''));
            });

            return {
                pre: function preLinkThiSwitch(scope) {
                    var caseIdx = testFn(valueFn(scope));
                    caseStack.push(activeCase);
                    activeCase = caseIdx;
                },
                post: function postLinkThiSwitch(scope, iAttrs) {
                    activeCase = caseStack.pop();
                }
            };
        }
    });

    var thiSwitchWhen = new directiveTypes.TemplateDirective({
        selector: '[thi-switch-when]',
        compile: function (tAttrs, context) {
            var expr = tAttrs['thi-switch-when'];
            var valueFn = parse(expr);
            delete tAttrs['thi-switch-when'];

            var switchSvc = context.getAncestorService('thiSwitch');
            if (! switchSvc) {
                throw new Error('thi-switch-when cannot be used outside of thi-switch context');
            }

            var testFn = switchSvc.registerWhen(valueFn);

            return function linkThiSwitchWhen(scope, appendInstance) {
                if (testFn()) {
                    appendInstance();
                }
            }
        }
    });

    var thiSwitchElse = new directiveTypes.TemplateDirective({
        selector: '[thi-switch-else]',
        compile: function (tAttrs, context) {
            delete tAttrs['thi-switch-else'];

            var switchSvc = context.getAncestorService('thiSwitch');
            if (! switchSvc) {
                throw new Error('thi-switch-else cannot be used outside of thi-switch context');
            }

            var testFn = switchSvc.registerElse();

            return function linkThiSwitchElse(scope, appendInstance) {
                if (testFn()) {
                    appendInstance();
                }
            }
        }
    });

    var ret = [
        thiIf,
        thiRepeat,
        thiSwitch,
        thiSwitchWhen,
        thiSwitchElse
    ];
    ret.thiIf = thiIf;
    ret.thiRepeat = thiRepeat;
    ret.thiSwitch = thiSwitch;
    ret.thiSwitchWhen = thiSwitchWhen;
    ret.thiSwitchElse = thiSwitchElse;

    return ret;
}

module.exports = StandardDirectives;
