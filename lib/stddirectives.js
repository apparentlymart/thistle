
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

    var ret = [
        thiIf,
        thiRepeat
    ];
    ret.thiIf = thiIf;
    ret.thiRepeat = thiRepeat;

    return ret;
}

module.exports = StandardDirectives;
