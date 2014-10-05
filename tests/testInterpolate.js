
var Interpolate = require('../lib/interpolate.js');

var defaultInterpolate = Interpolate(
    {
        parse: function dummyParse(exprStr) {
            return function dummyLinkExpr(scope) {
                return scope[exprStr];
            }
        }
    }
);

function okTest(text, expectedResult) {
    return function (test) {
        var linkFn = defaultInterpolate(text);
        var gotResult = linkFn({
            v1: 'abc123',
            v2: '123abc',
            missing1: undefined,
            missing2: null,
            num: 5,
            obj: {hi:true}
        });
        test.equal(gotResult, expectedResult, text + ' produces expected result');
        test.done();
    }
}

module.exports = {

    testNoInterpolation: okTest('hello', 'hello'),
    testOneInterpolation: okTest('hello {{v1}}', 'hello abc123'),
    testTwoInterpolations: okTest('hello {{v1}} {{v2}}', 'hello abc123 123abc'),
    testAdjacentInterpolations: okTest('hello {{v1}}{{v2}}', 'hello abc123123abc'),
    testJustInterpolation: okTest('{{v1}}', 'abc123'),
    testTrailingText: okTest('{{v1}} woo', 'abc123 woo'),
    testInterpolateNumber: okTest('{{num}}', '5'),
    testInterpolateUndefined: okTest('woo {{missing1}}', 'woo '),
    testInterpolateNull: okTest('{{missing2}}', ''),
    testInterpolateObject: okTest('{{obj}}', '{\n    "hi": true\n}'),

    testAllOrNothing: function (test) {
        var linkFn = defaultInterpolate('foo {{missing}}', {allOrNothing: true});
        var result = linkFn({});
        test.equal(result, undefined);

        linkFn = defaultInterpolate('foo {{missing}}', {allOrNothing: false});
        result = linkFn({});
        test.equal(result, 'foo ');

        test.done();
    },

    testOnlyIfExpression: function (test) {

        var linkFn = defaultInterpolate('foo {{missing}}', {onlyIfExpression: true});
        test.ok(typeof linkFn == 'function', 'interpolate with expression returned a function');

        linkFn = defaultInterpolate('foo', {onlyIfExpression: true});
        test.equal(linkFn, null, 'interpolate with no expression returned undefined');

        test.done();
    }

};
