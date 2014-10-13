
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

        this.compile = function compileTemplateDirective(tElement) {
            // compile function for template directive only gets to see attributes.
            // It is expected to remove its trigger attribute from the set
            // before returning.
            var directiveLink = directiveCompile(tElement.attribs);

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

            var contentLink = compile(contentTemplate);
            var contentAppend = contentLink.appendTo;

            return function linkTemplateDirective(scope, node) {
                function templateDirectiveInstance(scope) {
                    contentAppend(scope, node);
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
            templateLinkFn = compile(templateLinkFn).appendTo;
        }

        this.selector = selector;
        this.match = compileSelector(selector);
        this.type = 'component';

        this.compile = function compileComponentDirective(tElement) {
            // compile function for template directive only gets to see attributes.
            // It is expected to remove its trigger attribute (if any) from the set
            // before returning.
            var directiveController = directiveCompile(tElement.attribs);

            var contentTemplate = {
                type: 'root',
                children: [tElement],
                root: null
            };
            var contentLink = compile(tElement);
            var contentAppend = contentLink.appendTo;

            return function linkComponentDirective(scope, node) {
                function appendContent(innerScope, innerNode) {
                    contentAppend(scope, innerNode);
                }

                var componentModel = new directiveController(scope);

                templateLinkFn(componentModel, node);
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
