let app = require('express')();

let i18n = require('hmpo-i18n');

i18n.middleware(app, {
    detect: true
});

app.get('/', function (req, res) {
    // a translate method is now available on the request
    // this will translate keys according to the language request headers
    res.json({
        greeting: req.translate('greeting') + ' ' + req.translate('name.first')
    });
});

app.listen(3000);
console.log('Server listening on port 3000');
console.log('Try running `curl localhost:3000 -H "Accept-Language: fr"`');
