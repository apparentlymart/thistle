
var Compile = require('../lib/compile.js');
var sinon = require('sinon');

function stubOpts() {
    return {
        parse: sinon.stub(),
        interpolate: sinon.stub(),
        htmlParser: sinon.stub()
    };
}

module.exports = {

    testEmpty: function (test) {
        var opts = stubOpts();
        var compile = Compile(opts);

        var result = compile({
            type: 'root',
            children: []
        })({});

        test.deepEqual(result, []);
        test.ok(! opts.parse.called, 'no parsing');
        test.ok(! opts.interpolate.called, 'no interpolating');
        test.ok(! opts.htmlParser.called, 'no HTML parsing');

        test.done();
    },

    testParseHtmlString: function (test) {
        var opts = stubOpts();
        opts.htmlParser.returns([]);
        var compile = Compile(opts);

        var result = compile('htmlstr')({});

        test.deepEqual(result, []);
        test.ok(! opts.parse.called, 'no parsing');
        test.ok(! opts.interpolate.called, 'no interpolating');
        test.ok(opts.htmlParser.calledWithExactly('htmlstr'), 'called HTML parser');

        test.done();
    },

    testEmptyElement: function (test) {
        var opts = stubOpts();
        var compile = Compile(opts);

        var result = compile({
            type: 'root',
            children: [
                {
                    type: 'tag',
                    name: 'p',
                    attribs: {},
                    children: []
                }
            ]
        })({});

        test.equal(result.length, 1, 'one node in result');
        test.equal(result[0].type, 'tag', 'result node is an element');
        test.equal(result[0].name, 'p', 'result element is a paragraph');
        test.deepEqual(result[0].attribs, {}, 'result element has no attributes');
        test.deepEqual(result[0].children, [], 'result element has no children');

        test.done();
    },

    testChildNodes: function (test) {
        var opts = stubOpts();
        var compile = Compile(opts);

        var result = compile({
            type: 'root',
            children: [
                {
                    type: 'tag',
                    name: 'p',
                    attribs: {},
                    children: [
                        {
                            type: 'tag',
                            name: 'div',
                            attribs: {},
                            children: []
                        }
                    ]
                }
            ]
        })({});

        test.equal(result.length, 1, 'one node in result');
        test.equal(result[0].type, 'tag', 'result node is an element');
        test.equal(result[0].name, 'p', 'result element is a paragraph');
        test.deepEqual(result[0].attribs, {}, 'result element has no attributes');
        test.equal(result[0].children.length, 1, 'result element has one child');
        test.equal(result[0].children[0].type, 'tag', 'result child is element');
        test.equal(result[0].children[0].name, 'div', 'result child is div');

        test.done();
    },

    testTextNodeNoInterpolate: function (test) {
        var opts = stubOpts();
        var compile = Compile(opts);

        opts.interpolate.returns(null);
        var result = compile({
            type: 'root',
            children: [
                {
                    type: 'text',
                    data: 'baz'
                }
            ]
        })({});

        test.equal(result.length, 1, 'one node in result');
        test.equal(result[0].type, 'text', 'result node is text');
        test.equal(result[0].data, 'baz', 'result text is identical to input');
        test.ok(opts.interpolate.calledWithExactly(
            'baz', { onlyIfExpression: true }
        ), 'input passed to interpolate');

        test.done();
    },

    testTextNodeInterpolate: function (test) {
        var opts = stubOpts();
        var compile = Compile(opts);

        var linkFn = sinon.stub().returns('interpolated');
        opts.interpolate.returns(linkFn);
        var scope = {dummyScope: true};
        var result = compile({
            type: 'root',
            children: [
                {
                    type: 'text',
                    data: 'baz'
                }
            ]
        })(scope);

        test.equal(result.length, 1, 'one node in result');
        test.equal(result[0].type, 'text', 'result node is text');
        test.equal(result[0].data, 'interpolated', 'result text was interpolated');
        test.ok(opts.interpolate.calledWithExactly(
            'baz', { onlyIfExpression: true }
        ), 'input passed to interpolate');
        test.ok(linkFn.calledWithExactly(scope));

        test.done();
    },

    testDoctype: function (test) {
        var opts = stubOpts();
        var compile = Compile(opts);

        var result = compile({
            type: 'root',
            children: [
                {
                    type: 'directive',
                    data: '!DOCTYPE html'
                }
            ]
        })({});

        test.equal(result.length, 1, 'one node in result');
        test.equal(result[0].type, 'directive', 'result node is directive');
        test.equal(result[0].data, '!DOCTYPE html', 'result text is identical to input');
        test.ok(! opts.interpolate.called, 'no interpolate');

        test.done();
    },

    testTemplateDirective: function (test) {
        var opts = stubOpts();

        var directiveLinkFn = sinon.stub();
        var directive = {
            type: 'template',
            compile: sinon.stub().returns(directiveLinkFn),
            match: sinon.stub().returns(true)
        };
        opts.directives = [directive];

        var compile = Compile(opts);

        var directiveElement = {
            type: 'tag',
            name: 'foo',
            attribs: {},
            children: [
                {
                    type: 'text',
                    data: 'foo'
                }
            ]
        };

        var scope = {dummyScope: true};
        var result = compile({
            type: 'root',
            children: [
                directiveElement
            ]
        })(scope);

        test.equal(result.length, 0, 'no nodes in result');
        test.ok(directive.match.calledWithExactly(directiveElement), 'directive match called');
        test.ok(directive.compile.calledWithExactly(directiveElement), 'directive compile called');
        var linkCall = directiveLinkFn.firstCall;
        test.equal(linkCall.args.length, 2, 'linkfn passed two arguments');
        test.equal(linkCall.args[0], scope, 'linkfn passed scope');
        test.equal(linkCall.args[1].type, 'root', 'linkfn passed root node');

        test.done();
    },

    testUnmatchedDirective: function (test) {
        var opts = stubOpts();

        var directive = {
            type: 'template',
            compile: sinon.stub(),
            match: sinon.stub().returns(false)
        };
        opts.directives = [directive];

        var compile = Compile(opts);

        var directiveElement = {
            type: 'tag',
            name: 'foo',
            attribs: {},
            children: []
        };

        var result = compile({
            type: 'root',
            children: [
                directiveElement
            ]
        })({});

        test.ok(directive.match.calledWithExactly(directiveElement), 'directive match called');
        test.ok(! directive.compile.called, 'directive compile not called');
        test.equal(result.length, 1, 'one node in result');
        test.equal(result[0].type, 'tag', 'result node is element');
        test.equal(result[0].name, 'foo', 'result element is a foo');

        test.done();
    },

    testTwoTemplateDirectives: function (test) {
        var opts = stubOpts();

        opts.directives = [
            {
                type: 'template',
                compile: sinon.stub(),
                match: sinon.stub().returns(true)
            },
            {
                type: 'template',
                compile: sinon.stub(),
                match: sinon.stub().returns(true)
            }
        ];

        var compile = Compile(opts);

        var directiveElement = {
            type: 'tag',
            name: 'foo',
            attribs: {},
            children: []
        };

        test.throws(function () {
            compile({
                type: 'root',
                children: [
                    directiveElement
                ]
            });
        });

        test.ok(opts.directives[0].match.calledWith(directiveElement), 'first directive match called');
        test.ok(opts.directives[1].match.calledWith(directiveElement), 'second directive match called');
        test.ok(! opts.directives[0].compile.called, 'first directive not compiled');
        test.ok(! opts.directives[1].compile.called, 'second directive not compiled');

        test.done();
    },

    testMisplacedThiContent: function (test) {
        var opts = stubOpts();

        var compile = Compile(opts);
        var result = compile({
            type: 'root',
            children: [
                {
                    type: 'tag',
                    name: 'thi-content',
                    attribs: {},
                    children: []
                }
            ]
        })({});

        test.equal(result.length, 0, 'no nodes in result');

        test.done();
    },

    testComponentDirective: function (test) {
        var opts = stubOpts();

        var linkSpy = sinon.spy();
        function directiveLinkFn(scope, node, contentLinkFn) {
            var children = node.children;
            children.push({
                type: 'tag',
                name: 'div',
                attribs: {},
                children: []
            });
            children.push({
                type: 'tag',
                name: 'span',
                attribs: {
                    foo: 'bar'
                },
                children: []
            });
            children.push({
                type: 'text',
                data: 'baz'
            });
            linkSpy.apply(this, arguments);
        }
        var directive = {
            type: 'component',
            compile: sinon.stub().returns(directiveLinkFn),
            match: sinon.stub().returns(true)
        };
        opts.directives = [directive];

        var compile = Compile(opts);

        var directiveElement = {
            type: 'tag',
            name: 'foo',
            attribs: {
                baz: 'boom'
            },
            children: [
                {
                    type: 'text',
                    data: 'foo'
                }
            ]
        };

        var scope = {dummyScope: true};
        var result = compile({
            type: 'root',
            children: [
                directiveElement
            ]
        })(scope);

        test.equal(result.length, 3, 'three nodes in result');
        test.equal(result[0].type, 'tag', 'first node is an element');
        test.equal(result[0].name, 'div', 'first node is div');
        test.deepEqual(result[0].attribs, {baz: 'boom'}, 'first node got attributes from template');
        test.equal(result[1].type, 'tag', 'second node is an element');
        test.equal(result[1].name, 'span', 'second node is span');
        test.deepEqual(
            result[1].attribs, {foo: 'bar', baz: 'boom'}, 'second node got attributes from template'
        );
        test.equal(result[2].type, 'text', 'third node is text');
        test.equal(result[2].data, 'baz', 'third node has correct text content');
        test.equal(result[2].attribs, undefined, 'third node has no attributes');
        test.ok(directive.match.calledWithExactly(directiveElement), 'directive match called');
        test.ok(directive.compile.calledWithExactly(directiveElement), 'directive compile called');
        var linkCall = linkSpy.firstCall;
        test.equal(linkCall.args.length, 3, 'linkfn passed three arguments');
        test.equal(linkCall.args[0], scope, 'linkfn passed scope');
        test.equal(linkCall.args[1].type, 'root', 'linkfn passed root node');
        test.equal(linkCall.args[2], undefined, 'linkfn passed no contentLinkFn');

        test.done();
    }

};
