/*eslint no-unused-vars:[2, { vars:"all", args: "none" }]*/

const _ = require('lodash');
const Translator = require('./translator');
const localisedView = require('./localised-view'); 

module.exports = (app, options) => {

  options = options || {};
  options.cookie = options.cookie || {};

  const translator = new Translator(options);

  const detectLanguage = (req, res) => {
    let lang;
    const header = req.headers['accept-language'];
    if (options.query && req.query && req.query[options.query]) {
      lang = req.query[options.query].split(',');
    } else if (options.cookie.name && req.cookies && req.cookies[options.cookie.name]) {
      lang = req.cookies[options.cookie.name].split(',');
    } else if (options.detect && header && header !== '*') {
      lang = header.split(',');
    }
    setLanguage(req, res, lang);
  };

  const reLang = /^\s*([a-zA-Z-]+)/;

  const setLanguage = (req, res, lang) => {
    req.lang = lang || [];
    if (typeof req.lang === 'string') req.lang = [req.lang];
    req.lang = req.lang.map(lang => lang.match(reLang)[1]);
    if (options.allowedLangs) {
      req.lang = _.intersection(req.lang, options.allowedLangs);
    }
    saveLanguage(req, res);
  }

  const saveLanguage = (req, res) => {
    if (req.lang && options.cookie.name && res.cookie) {
      res.cookie(options.cookie.name, req.lang.join(','), options.cookie);
    }
    res.locals = res.locals || {};
    res.locals.lang = req.lang;
    res.locals.htmlLang = _.first(req.lang) || _.first(translator.options.fallbackLang);
  };

  const middleware = function (req, res, next) {
    detectLanguage(req, res);
    req.setLanguage = function(lang) {
      setLanguage(req, res, lang);
    };
    translator.on('ready', () => {
      req.translate = function translate(key, options) {
        options = options || {};
        options.lang = options.lang || req.lang;
        options.namespace = options.namespace || req.namespace;
        options = _.omitBy(options, _.isUndefined);
        return translator.translate(key, options);
      };
      res.locals.translate = res.locals.t = req.translate;
      next();
    });
  };

  app.use(middleware);
  localisedView.setup(app, translator, options);
};
