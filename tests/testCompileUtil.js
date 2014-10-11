
var compileUtil = require('../lib/compileutil.js');

function makeEncodeJsonTest(val, expectedOut) {
    return function (test) {
        var result = compileUtil.encodeJsonWithVars(val);
        test.equal(result, expectedOut);
        test.done();
    };
}

module.exports = {

    testCombineLinkFuncs: function (test) {
        var testFuncs = [
            function (scope, nodes) {
                nodes.push(scope.a);
            },
            function (scope, nodes) {
                nodes.push(scope.b);
            },
            function (scope, nodes) {
                nodes.push(scope.c);
            }
        ];

        var combinedFunc = compileUtil.combineLinkFuncs(testFuncs);

        var nodes = [];
        var scope = {
            a: 3,
            b: 2,
            c: 1
        };
        combinedFunc(scope, nodes);

        test.deepEqual(
            nodes,
            [3, 2, 1]
        );

        test.done();
    },

    testEncodeJsonString: makeEncodeJsonTest(
        'hello',
        '"hello"'
    ),
    testEncodeJsonNumber: makeEncodeJsonTest(
        1,
        '1'
    ),
    testEncodeJsonBoolean: makeEncodeJsonTest(
        true,
        'true'
    ),
    testEncodeJsonUndefined: makeEncodeJsonTest(
        undefined,
        'undefined'
    ),
    testEncodeJsonNull: makeEncodeJsonTest(
        null,
        'null'
    ),
    testEncodeJsonVariable: makeEncodeJsonTest(
        new compileUtil.VarRef('foo'),
        'foo'
    ),
    testEncodeEmptyArray: makeEncodeJsonTest(
        [],
        '[]'
    ),
    testEncodeArray: makeEncodeJsonTest(
        [1, 2, 3],
        '[1,2,3]'
    ),
    testEncodeEmptyObject: makeEncodeJsonTest(
        {},
        '{}'
    ),
    testEncodeObject: makeEncodeJsonTest(
        {a:1, b:2, c:3},
        '{"a":1,"b":2,"c":3}'
    ),

    testMakeObjTemplateFunc: function (test) {
        // Not comprehensive since we know this uses encodeJsonWithVars and we
        // already tested that extensively above.

        var template = {
            a: new compileUtil.VarRef('foo'),
            b: [new compileUtil.VarRef('bar')],
            c: {baz: new compileUtil.VarRef('baz')}
        };

        var func = compileUtil.makeObjTemplateFunc(template, ['foo', 'bar', 'baz']);

        var result = func(1, {bar: 'yes'}, true);

        test.deepEqual(
            result,
            {
                a: 1,
                b: [{bar: 'yes'}],
                c: {baz: true}
            }
        );

        test.done();
    }

};
