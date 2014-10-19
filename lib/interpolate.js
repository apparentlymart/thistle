
var util = require('util');

function InterpolateError(message) {
    Error.call(this);
    this.message = message;
}
util.inherits(InterpolateError, Error);

function Interpolate(opts) {
    var startSymbol = opts.startSymbol || '{{';
    var endSymbol = opts.startSymbol || '}}';
    var startSymbolLength = startSymbol.length;
    var endSymbolLength = endSymbol.length;
    var parse = opts.parse;

    return function interpolate(text, opts) {
        opts = opts || {};
        var onlyIfExpression = opts.onlyIfExpression || false;
        var allOrNothing = opts.allOrNothing || false;

        var startIndex;
        var endIndex;
        var currentIndex = 0;
        var concat = [];
        var linkFns = [];
        var linkPositions = [];
        var textLength = text.length;

        while (currentIndex < textLength) {
            startIndex = text.indexOf(startSymbol, currentIndex);
            if (startIndex !== -1) {
                endIndex = text.indexOf(endSymbol, startIndex + startSymbolLength);
                if (endIndex === -1) {
                    throw new InterpolateError('Unclosed interpolated expression');
                }

                // Push any text sitting before the interpolation.
                if (currentIndex !== startIndex) {
                    concat.push(text.substring(currentIndex, startIndex));
                }

                var expStr = text.substring(startIndex + startSymbolLength, endIndex);

                // Doubling up the start and end symbols escapes them.
                if (expStr.indexOf(startSymbol) == 0) {
                    if (text.substr(endIndex + 2, 2) === endSymbol) {
                        concat.push(expStr + '}}');
                        currentIndex = endIndex + endSymbolLength + endSymbolLength;
                        continue;
                    }
                }

                linkFns.push(parse(expStr));
                linkPositions.push(concat.length);
                concat.push(''); // placeholder for the interpolated expression
                currentIndex = endIndex + endSymbolLength;
            }
            else {
                // Push the remaining text, if any.
                if (currentIndex !== textLength) {
                    concat.push(text.substring(currentIndex));
                }
                break;
            }
        }

        if (onlyIfExpression && ! linkFns.length) {
            // Don't return a function, signalling the caller that
            // no interpolation is required for this string.
            return null;
        }

        function safeEvaluate(linkFn, scope) {
            try {
                return linkFn(scope);
            }
            catch (e) {
                // Turn errored evaluations into the empty string,
                // so we don't blow up the whole evaluation at runtime.
                // TODO: Provide a way to log these errors somehow?
                return '';
            }
        }

        function stringify(value) {
            if (value == null) { // also if undefined
                return '';
            }
            switch (typeof value) {
                case 'string': return value;
                case 'number': return '' + value;
                default: return JSON.stringify(value, null, 4);
            }
        }

        return function linkInterpolation(scope) {
            for (var i = linkFns.length - 1; i >= 0; i--) {
                var value = safeEvaluate(linkFns[i], scope);
                if (allOrNothing && typeof(value) === 'undefined') {
                    return undefined;
                }
                concat[linkPositions[i]] = stringify(value);
            }
            return concat.join('');
        };
    };
}

module.exports = Interpolate;
