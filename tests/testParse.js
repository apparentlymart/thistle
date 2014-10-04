
var Parse = require('../lib/parse.js');
var esprima = require('esprima');

var defaultParse = Parse(
    {
        astBuilder: Parse.esprimaAstBuilder(esprima),
        filters: {
            takeOne: function () {
                return function (n) { return n - 1; };
            },
            take: function(m) {
                return function(n) { return n - m; };
            }
        }
    }
);

function okTest(exprStr, expectedValue) {
    return function (test) {
        var linkFn = defaultParse(exprStr);
        var gotValue = linkFn({
            number3: 3,
            number5: 5,
            greeting: 'hello',
            greet: function (who) {
                return 'hello ' + who;
            },
            obj: {
                a: true,
                obj: {
                    b: true
                }
            }
        });
        test.deepEqual(gotValue, expectedValue, exprStr + ' produces expected value');
        test.done();
    };
}

function errorTest(exprStr) {
    return function (test) {
        test.throws(function () {
            defaultParse(exprStr);
        }, Parse.ParseError, exprStr + ' causes ParseError');
        test.done();
    };
}

module.exports = {

    testBinaryOp: okTest('5 - 1', 4),
    testUnaryOp: okTest('-1', -1),
    testCall: okTest('greet("world")', 'hello world'),
    testIdentMember: okTest('obj.a', true),
    testExprMember: okTest('obj["a"]', true),
    testVariable: okTest('number5', 5),
    testLiteralNumber: okTest('10', 10),
    testLiteralBoolean: okTest('true', true),
    testLiteralString: okTest('"a"', 'a'),
    testLiteralArray: okTest('[1,2,3]', [1, 2, 3]),
    testLiteralObject: okTest('{a: true, b: false}', {a: true, b: false}),
    testNoArgFilter: okTest('6 | takeOne', 5),
    testArgFilter: okTest('6 | take(2)', 4),

    testNoAccessToGlobals: okTest('module', undefined),

    testSyntaxError: errorTest('1 +'),
    testDeclaration: errorTest('var a'),
    testAssignment: errorTest('a = 2'),
    testFunctionLiteral: errorTest('(function () {})'),
    testTwoExpressions: errorTest('a; b;'),
    testCommas: errorTest('a, b')

};
