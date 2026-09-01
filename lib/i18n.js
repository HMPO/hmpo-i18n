import Translator from './translator.js';
import middleware from './middleware.js';
import fsBackend from './backends/fs.js';

function i18n(options) {
    return new Translator(options);
}

i18n.middleware = middleware;

i18n.Translator = Translator;

i18n.backends = {
    fs: fsBackend
};

export default i18n;
