/* istanbul ignore file */

let util = require('util');
let EventEmitter = require('events').EventEmitter;

let _ = require('lodash');
let deepCloneMerge = require('deep-clone-merge');

function arrayify(value) {
    return [].concat(value || []);
}

function Translator(options) {
    options = _.extend({
        resources: {},
        backend: require('./backends/fs'),
        fallbackLang: ['en'],
        fallbackNamespace: ['default'],
        watch: false
    }, options);


    this.options = options;

    if (typeof this.options.backend.load !== 'function') {
        throw new Error('Invalid backend. Backend must expose a `load` method.');
    }

    this._ready = false;
    this.on('ready', () => {
        this._ready = true;
    });

    this.reload();
}

util.inherits(Translator, EventEmitter);

Translator.prototype.on = function (event, handler) {
    if (event === 'ready' && this._ready) {
        process.nextTick(handler);
    } else {
        return EventEmitter.prototype.on.apply(this, arguments);
    }
};

Translator.prototype.reload = function () {
    this.datastore = this.options.resources || this.datastore || {};
    this.options.backend.load(this.options, (err, data) => {
        if (err) throw err;
        this.datastore = deepCloneMerge(this.options.resources, data);
        this.emit('ready');
    });
};

Translator.prototype.translate = function (keys, options) {
    options = options || {};

    if (typeof options === 'string' || Array.isArray(options)) {
        options = {
            lang: options
        };
    }

    options = _.extend({ self: true }, options);

    let langs = this.getLanguages(options);
    let namespaces = this.getNamespaces(options);

    keys = arrayify(keys);

    return _.reduce(langs, (str, lang) => {
        return str || _.reduce(namespaces, (str, ns) => {
            return str || _.reduce(keys, (str, k) => {
                return str || _.get(this.datastore[lang], ns === 'default' ? k : ns + '.' + k);
            }, null);
        }, null);
    }, null) || options.default || (options.self && keys[0]);
};

Translator.prototype.getLanguages = function (options) {
    options = options || {};
    let langs = _.clone(this.options.fallbackLang) || [];
    options.lang = arrayify(options.lang);
    _.eachRight(options.lang, function (lng) {
        if (lng.indexOf('-')) {
            langs.unshift(lng.split('-')[0]);
        }
        langs.unshift(lng);
    });
    return _.uniq(langs);
};

Translator.prototype.getNamespaces = function (options) {
    options = options || {};
    let namespaces = this.options.fallbackNamespace || [];
    options.namespace = arrayify(options.namespace);
    return _.uniq([].concat(options.namespace, namespaces));
};

module.exports = Translator;
