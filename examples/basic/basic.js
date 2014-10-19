
var thistle = require('thistle');
var compiler = thistle();

var render = compiler.compile('<ul>\n<li thi-repeat="item in items">{{ item }}</li>\n</ul>');

var nodes = render({items:['a', 'b', 'c']});

console.log(compiler.serializeHtml(nodes));
