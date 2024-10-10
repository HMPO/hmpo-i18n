let app = require('express')();

let i18n = require('hmpo-i18n');

i18n.middleware(app, {
    detect: true
});

app.set('view engine', 'html');
app.engine('html', require('mustache-express')());

// add a translate mixin to mustache to use in templates
app.use(function (req, res, next) {
    res.locals.translate = function () {
        return req.translate;
    };
    next();
});

app.get('/', function (req, res) {
    // translate can now be used in templates
    res.render('index');
});

app.listen(3000);
console.log('Server listening on port 3000');
console.log('Try running `curl localhost:3000 -H "Accept-Language: fr"`');
