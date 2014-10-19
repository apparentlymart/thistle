
function DirectiveTypes(opts) {
    var compile = opts.compile;
    var compileSelector = opts.compileSelector;

    function TemplateDirective(def) {
        def = def || {};
        var selector = def.selector || '';
        var directiveCompile = def.compile || function () { return function () {}; };

        this.selector = selector;
        this.match = compileSelector(selector);
        this.type = 'template';

        this.compile = function compileTemplateDirective(tElement, context) {
            // compile function for template directive only gets to see attributes.
            // It is expected to remove any trigger attributes, or any other attributes
            // that belong to it, from the set before returning.
            var directiveLink = directiveCompile(tElement.attribs, context);

            var contentTemplate;
            if (tElement.name === 'template') {
                contentTemplate = tElement;
            }
            else {
                // Artificially create a root node around the element
                // so we can compile the element *and* its children.
                // By this point the directive-specific compile function
                // should have removed its attribute from the attributes
                // map, preventing us from compiling the same
                // template directive a second time.
                contentTemplate = {
                    type: 'root',
                    children: [tElement],
                    root: null
                };
                contentTemplate.root = contentTemplate;
            }

            var contentLink = compile(contentTemplate, context.makeChildNodeContext());
            var contentAppend = contentLink.appendTo;

            return function linkTemplateDirective(scope, node, contentLinkFn) {
                function templateDirectiveInstance(scope) {
                    contentAppend(scope, node, contentLinkFn);
                }

                // Directive link function gets to conditionally call
                // templateDirectiveInstance zero or more times depending
                // on what it finds in the scope.
                directiveLink(scope, templateDirectiveInstance);
            };
        }
    }

    function ComponentDirective(def) {
        def = def || {};
        var selector = def.selector || '';
        var templateLinkFn = def.template || '';
        var directiveCompile = def.compile || function () { return function () {}; };

        if (typeof templateLinkFn !== 'function') {
            // Compiler context is intentionally *not* passed into the component
            // template, since the component template should be isolated from its
            // calling template... component template behavior mustn't vary depending
            // on the calling context.
            templateLinkFn = compile(templateLinkFn).appendTo;
        }

        this.selector = selector;
        this.match = compileSelector(selector);
        this.type = 'component';

        this.compile = function compileComponentDirective(tElement, context) {
            // compile function for template directive only gets to see attributes.
            // It is expected to remove its trigger attribute (if any) from the set
            // before returning.
            var directiveController = directiveCompile(tElement.attribs, context);

            var contentLink = compile(tElement, context.makeChildNodeContext());
            var contentAppend = contentLink.appendTo;

            return function linkComponentDirective(scope, node, contentLinkFn) {
                function appendContent(innerScope, innerNode, innerContentLinkFn) {
                    contentAppend(scope, innerNode, contentLinkFn);
                }

                var componentModel = new directiveController(scope);

                // Note that the component template sees the contentLinkFn from
                // the directive element's content, not the parent's contentLinkFn.
                templateLinkFn(componentModel, node, appendContent);
            }
        };
    }

    function DecoratorDirective(def) {
        def = def || {};
        var selector = def.selector || '';
        var compile = def.compile || function () { return function () {}; };

        this.selector = selector;
        this.match = compileSelector(selector);
        this.type = 'decorator';
        this.compile = null;
    };

    return {
        TemplateDirective: TemplateDirective,
        ComponentDirective: ComponentDirective,
        DecoratorDirective: DecoratorDirective
    };

};

module.exports = DirectiveTypes;
