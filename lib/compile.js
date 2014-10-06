
var util = require('util');

function CompileError(message) {
    Error.call(this);
    this.message = message;
}
util.inherits(CompileError, Error);

function Compile(opts) {
    var parse = opts.parse;
    var interpolate = opts.interpolate;
    var directives = opts.directives || {};
    var cheerio = opts.cheerio;

    function compileNodes(nodes, transcludeFn) {
        var linkFns = [];

        // We expect the list of nodes to change as we traverse,
        // but only the current node or future nodes may change;
        // past nodes may not change once they have been processed.
        for (var i = 0; i < nodes.length; i++) {
            var directives = collectDirectives(nodes[i]);

            var nodeLinkFn = applyDirectives(directives, nodes[i], transcludeFn, [], []);
            var childLinkFn;
            if (nodes[i].children) {
                childLinkFn = compileNodes(nodes[i].children || []);
            }

            linkFns.push(i, nodeLinkFn, childLinkFn);
        }

        if (! linkFns.length) {
            // Signal that there's nothing to link.
            return null;
        }

        return function linkNodeTree(scope, nodes, parentBoundTranscludeFn) {
            var i;

            // The link functions may change the order of the nodes, so
            // we first create a stable node list.
            var stableNodes = new Array(nodes.length);
            for (i = 0; i < linkFns.length; i += 3) {
                var idx = linkFns[i];
                stableNodes[idx] = nodes[idx];
            }

            var linkFnsLength = linkFns.length;
            for (i = 0; i < linkFnsLength;) {
                var node = stableNodes[linkFns[i++]];
                var nodeLinkFn = linkFns[i++];
                var childLinkFn = linkFns[i++];

                if (nodeLinkFn) {
                    // TODO: handle isolate scopes
                    var childScope = scope;

                    // TODO: Handle transclude, template, etc.
                    var childBoundTranscludeFn = null;

                    nodeLinkFn(childScope, cheerio(node), childLinkFn, childBoundTranscludeFn);
                }
                else if (childLinkFn) {
                    childLinkFn(scope, cheerio(node.children), parentBoundTranscludeFn);
                }
            }
        }
    }

    function applyDirectives(directives, tNode, transcludeFn, preLinkFns, postLinkFns) {
        var terminalPriority = -Number.MAX_VALUE;
        var childTranscludeFn = transcludeFn;
        var directive;

        function addLinkFns(pre, post, attrStart, attrEnd) {
            if (pre) {
                // TODO: Handle multi-element directives.
                pre.require = directive.require;
                // TODO: Handle isolate scope
                preLinkFns.push(pre);
            }
            if (post) {
                // TODO: Handle multi-element directives.
                post.require = directive.require;
                // TODO: Handle isolate scope
                postLinkFns.push(post);
            }
        }

        for (var i = 0; i < directives.length; i++) {
            directive = directives[i];
            var startAttrName = directive.startAttrName;
            var endAttrName = directive.endAttrName;

            // TODO: Handle startAttrName for multi-element directives.

            if (terminalPriority > directive.priority) {
                break;
            }

            // TODO: Handle scope requests.

            // TODO: Handle controllers

            // TODO: Handle transclude

            // TODO: Handle template

            if (directive.compile) {
                var linkFn = directive.compile(tNode, transcludeFn);
                if (typeof linkFn == 'function') {
                    addLinkFns(null, linkFn, startAttrName, endAttrName);
                }
                else {
                    addLinkFns(linkFn.pre, linkFn.post, startAttrName, endAttrName);
                }
            }

            if (directive.terminal) {
                terminalPriority = Math.max(terminalPriority, directive.priority);
            }
        }

        var preLinkFnCount = preLinkFns.length;
        var postLinkFnCount = postLinkFns.length;

        return function linkNodeDirectives(scope, iNode, childLinkFn, boundTranscludeFn) {

            var i;
            var linkFn;

            // This is just a basic placeholder that needs to get replaced once we
            // support features like isolate scopes, etc.
            // TODO: Also add exception handling around user-supplied link functions so
            // that we can't blow up at link time.

            for (i = 0; i < preLinkFnCount; i++) {
                linkFn = preLinkFns[i];
                linkFn(scope, iNode);
            }

            if (childLinkFn) {
                childLinkFn(scope, cheerio(iNode[0].children));
            }

            for (i = 0; i < postLinkFnCount; i++) {
                linkFn = postLinkFns[i];
                linkFn(scope, iNode);
            }

        }
    }

    function collectDirectives(node) {
        var nodeType = node.type;
        var directives = [];

        switch (nodeType) {
            case 'tag': {
                tryAddDirective(directives, node.name, 'E');

                var attrs = node.attribs;
                for (var attrName in attrs) {
                    if (! attrs.hasOwnProperty(attrName)) {
                        continue;
                    }

                    var startAttrName, endAttrName;

                    var directiveName = attrName;
                    addAttributeInterpolate(directives, attrName, attrs[attrName]);
                    tryAddDirective(directives, directiveName, 'A');

                    if (attrName === 'class') {
                        var classNames = attrs['class'].split(/\s+/);
                        for (var ci = 0; ci < classNames.length; ci++) {
                            if (classNames[ci]) {
                                tryAddDirective(directives, classNames[ci], 'C');
                            }
                        }
                    }
                }
            } break;

            case 'text': {
                addTextInterpolate(directives, node.data);
            } break;
        }

        directives.sort(function (a, b) {
            if (a.priority != b.priority) return b.priority - a.priority;
            if (a.name !== b.name) return (a.name < b.name) ? -1 : 1;
            return a.index - b.index;
        });

        return directives;
    }

    function tryAddDirective(nodeDirectives, name, location, startAttrName, endAttrName) {
        var match = false;
        if (directives.hasOwnProperty(name)) {
            var directiveDefs = directives[name];
            for (var i = 0; i < directiveDefs.length; i++) {
                var directiveDef = Object.create(directiveDefs[i], {});
                var restrict = directiveDef.restrict || 'E';

                if (restrict.indexOf(location) === -1) {
                    continue;
                }

                if (startAttrName) {
                    directiveDef.startAttrName = startAttrName;
                    directiveDef.endAttrName = endAttrName;
                }
                directiveDef.index = nodeDirectives.length;
                if (! directiveDef.priority) {
                    directiveDef.priority = 0;
                }
                nodeDirectives.push(directiveDef);
                match = true;
            }
        }
        return match;
    }

    function addTextInterpolate(nodeDirectives, value) {
        var linkFn = interpolate(value, {
            onlyIfExpression: true
        });
        if (! linkFn) {
            return;
        }

        nodeDirectives.push({
            priority: 0,
            index: nodeDirectives.length,
            compile: function textInterpolateCompile() {
                return function textInterpolateLink(scope, iNode) {
                    // We know this directive is only ever applied to text nodes,
                    // so we'll just cheat and set the internal node property
                    // directly, rather than going through the cheerio interface
                    // and jumping through the hoops that implies.
                    iNode[0].data = linkFn(scope);
                }
            }
        });
    }

    function addAttributeInterpolate(nodeDirectives, attrName, value) {
        var linkFn = interpolate(value, {
            onlyIfExpression: true
        });
        if (! linkFn) {
            return;
        }

        nodeDirectives.push({
            priority: 100,
            index: nodeDirectives.length,
            compile: function () {
                return {
                    pre: function attributeInterpolatePreLink(scope, iElement) {
                        iElement.attr(attrName, linkFn(scope));
                    }
                }
            }
        });
    }

    return function compile(template, opts) {
        template = cheerio(template).clone();

        opts = opts || {};
        var transcludeFn = opts.transcludeFn;

        var compositeLinkFn = compileNodes(template, transcludeFn);

        return function linkTemplate(scope, cloneConnectFn, parentBoundTranscludeFn) {
            var iNodes = template.clone();

            // TODO: Handle controllers

            if (cloneConnectFn) {
                cloneConnectFn(iNodes, scope);
            }

            if (compositeLinkFn) {
                compositeLinkFn(scope, iNodes, parentBoundTranscludeFn);
            }

            return cheerio.html(iNodes);
        };
    };
}

module.exports = Compile;
