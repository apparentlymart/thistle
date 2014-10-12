
var util = require('util');
var compileUtil = require('./compileutil.js');

function CompileError(message) {
    Error.call(this);
    this.message = message;
}
util.inherits(CompileError, Error);

function Compile(opts) {
    var parse = opts.parse;
    var interpolate = opts.interpolate;
    var directives = opts.directives || [];
    var htmlParser = opts.htmlParser;

    function compileNodeChildren(parentNode) {
        var nodes = parentNode.children;
        var nodeLinkFns = [];

        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            var linkFn;

            switch (node.type) {
                case 'tag':
                case 'style':
                case 'script': {
                    linkFn = makeElementLinkFn(node);
                } break;

                case 'text': {
                    linkFn = makeTextLinkFn(node);
                } break;

                case 'directive': {
                    // NOTE: This is not 'directive' in the sense our template system means it.
                    // It's the node type used for e.g. a doctype declaration.
                    linkFn = makeDoctypeLinkFn(node);
                } break;
            }

            if (linkFn) {
                nodeLinkFns.push(linkFn);
            }
        }

        if (nodeLinkFns.length === 0) {
            // Let the caller know there is nothing special inside this node.
            return null;
        }

        return compileUtil.combineLinkFuncs(nodeLinkFns);
    }

    function makeElementLinkFn(element) {

        // TODO: Support directives. Currently we just do the standard copy/interpolate
        // behavior for all elements.

        var skeletonTemplate = {
            type: 'tag',
            name: element.name,
            attribs: {},
            children: [],
            parent: new compileUtil.VarRef('parent'),
            root: new compileUtil.VarRef('root')
        };
        var attrInterpolateFns = [];

        for (var attrName in element.attribs) {
            if (element.attribs.hasOwnProperty(attrName)) {
                var templateAttrValue = element.attribs[attrName];
                var attrValueLinkFn = interpolate(templateAttrValue, {
                    onlyIfExpression: true
                });

                if (attrValueLinkFn) {
                    skeletonTemplate.attribs[attrName] = new compileUtil.VarRef(
                        'attr' + attrInterpolateFns.length
                    );
                    attrInterpolateFns.push(attrValueLinkFn);
                }
                else {
                    skeletonTemplate.attribs[attrName] = templateAttrValue;
                }
            }
        }

        var attrInterpolateSrc = '';
        var skeletonFnParams = [];
        for (var i = 0; i < attrInterpolateFns.length; i++) {
            // TODO: HTML-escape the value.
            attrInterpolateSrc += 'var attr' + i + ' = attrI' + i + '(scope);\n';
            skeletonFnParams.push('attrI' + i);
        }
        var skeletonFnSrc = (
            'return function createNode(scope, root, parent) {\n' +
            attrInterpolateSrc +
            '\nreturn (\n' +
            compileUtil.encodeJsonWithVars(skeletonTemplate) +
            '\n); };'
        );
        skeletonFnParams.push(skeletonFnSrc);
        var skeletonFn = Function.apply(null, skeletonFnParams);
        var createNode = skeletonFn.apply(null, attrInterpolateFns);

        var childLinkFn = compileNodeChildren(element);

        return function linkElement(scope, parentNode) {
            var newNode = createNode(scope, parentNode.root, parentNode);
            if (childLinkFn) {
                childLinkFn(scope, newNode);
            }
            parentNode.children.push(newNode);
        };
    }

    function makeTextLinkFn(node) {
        var templateData = node.data;
        var linkFn = interpolate(templateData, {
            onlyIfExpression: true
        });
        var createNode;
        if (linkFn) {
            createNode = compileUtil.makeObjTemplateFunc(
                {
                    type: 'text',
                    data: new compileUtil.VarRef('data'),
                    parent: new compileUtil.VarRef('parent'),
                    root: new compileUtil.VarRef('root')
                },
                ['root', 'parent', 'data']
            );
            return function linkInterpolatedText(scope, parentNode) {
                // TODO: HTML-escape the data.
                var data = linkFn(scope);
                parentNode.children.push(createNode(parentNode.root, parentNode, data));
            };
        }
        else {
            createNode = compileUtil.makeObjTemplateFunc(
                {
                    type: 'text',
                    data: templateData,
                    parent: new compileUtil.VarRef('parent'),
                    root: new compileUtil.VarRef('root')
                },
                ['root', 'parent']
            );
            return function linkConstantText(scope, parentNode) {
                parentNode.children.push(createNode(parentNode.root, parentNode));
            };
        }
    }

    function makeDoctypeLinkFn(node) {
        var createNode = compileUtil.makeObjTemplateFunc(
            {
                type: 'directive',
                data: node.data,
                parent: new compileUtil.VarRef('parent'),
                root: new compileUtil.VarRef('root')
            },
            ['root', 'parent']
        );
        return function linkDoctype(scope, parentNode) {
            parentNode.children.push(createNode(parentNode.root, parentNode));
        };
    }

    function collectDirectives(node) {
        var templateDirective;
        var componentDirective;
        var decoratorDirectives = [];

        for (var i = 0; i < directives.length; i++) {
            var maybeDirective = directives[i];
            if (maybeDirective.match(node)) {
                switch (maybeDirective.type) {

                    case 'template': {
                        if (templateDirective) {
                            throw new CompileError(
                                'Cannot use ' + templateDirective.selector + ' and ' +
                                    maybeDirective.selector + ' on the same element.'
                            );
                        }
                        else {
                            templateDirective = maybeDirective;
                        }
                    } break;

                    case 'component': {
                        if (componentDirective) {
                            throw new CompileError(
                                'Cannot use ' + componentDirective.selector + ' and ' +
                                    maybeDirective.selector + ' on the same element.'
                            );
                        }
                        else {
                            componentDirective = maybeDirective;
                        }
                    } break;

                    case 'decorator': {
                        decoratorDirectives.push(maybeDirective);
                    } break;

                    default: {
                        throw new Error('Unknown directive type ' + maybeDirective.type);
                    } break;

                }
            }
        }
        return {
            template: templateDirective,
            component: componentDirective,
            decorators: decoratorDirectives
        };
    }

    function makeDefaultElementLinkFn(node) {
        return function defaultElementLink(scope, parentNode) {
            parentNode.children.push({
                type: 'tag',
                name: node.name,
                children: [],
                attribs: {},
                parent: parentNode,
                root: parentNode.root
            });
        }
    }

    function wrapChildLinkFn(fn) {
        return function (scope, node) {
            fn(scope, node.children);
        }
    }

    function wrapTextLinkFn(fn) {
        return function (scope, node) {
            node.children.push(fn(scope));
        }
    }

    return function compile(template, opts) {
        if (typeof template === 'string') {
            template = {
                type: 'root',
                children: htmlParser(template),
                root: null
            };
            template.root = template;
        }

        var linkFn = compileNodeChildren(template);

        return function linkToDom(scope) {
            var nodes = [];
            var root = {
                type: 'root',
                children: nodes,
                root: null
            };
            root.root = root;
            if (linkFn) {
                linkFn(scope, root);
            }
            return nodes;
        };
    };
}

module.exports = Compile;
