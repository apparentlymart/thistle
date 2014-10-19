# thistle - a slightly-prickly HTML template engine for NodeJS

Thistle is a HTML template engine for NodeJS that, unlike many other template systems, operates on
a DOM-like structure rather than on raw strings.

DOM-based templating adds a little more overhead (which thistle attempts to minimize) but in return allows
for more expressiveness via custom *directives* that allow for creating reusable template components and
other reusable functionality.

Thistle is inspired by (but not entirely compatible with) [AngularJS templates](https://docs.angularjs.org/guide/templates).
Thistle attempts to provide much of the expressive power of AngularJS while optimizing for fast template
rendering.

## Basic Usage

Instantiate a ``thistle`` instance to begin:

```js
var thistle = require('thistle');
var compiler = thistle();
```

By default the compiler has the basic, built-in directives and filters loaded. Templates using just these
features can be compiled:

```js
var render = compiler.compile('<ul>\n<li thi-repeat="item in items">{{ item }}</li>\n</ul>');
```

The ``compile`` method returns a function that takes a scope and returns a rendered DOM. A scope is just a
plain old JavaScript object whose keys become variables for the template:

```js
var nodes = render({items:['a', 'b', 'c']});
```

You'll usually want to render the resulting DOM as a string of HTML:

```js
console.log(compiler.serializeHtml(nodes));
```

This basic example then results in the following output:

```html
<ul>
<li>a</li><li>b</li><li>c</li>
</ul>
```

Most 'real' applications will compile all of the necessary templates once during startup and then render
them many times with different data. Thus ``thistle`` is designed to do extra preparation work during
compilation in order to enable faster rendering.

## Status

Thistle is still under early development and thus its interface is still subject to change until a
1.0.0 release is reached. More implementation experience is required before we can confidently commit
to an interface.

## License

Copyright (c) 2014 Martin Atkins

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

Contributions are welcome via github pull requests. Please make sure the tests
are passing (using ``npm test``) and try to stick keep things consistent with
the prevailing code style.

If you've tried to use Thistle in a real-world application and have design
feedback, please consider opening a github issue describing your application and
your suggestions.
