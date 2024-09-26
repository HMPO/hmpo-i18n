let i18n = require('hmpo-i18n')();

i18n.on('ready', function () {
    let en = i18n.translate('greeting', 'en');
    console.log('English:', en);
    let fr = i18n.translate('greeting', 'fr');
    console.log('French:', fr);
    let def = i18n.translate('greeting');
    console.log('Default fallback:', def);
});
