'use strict';

const fs = require('fs');
const path = require('path');

const localisedView = {
    cache: {},

    getLocalisedFileList(filename, ext, views, langs, options) {
        ext = path.extname(filename) || ext;
        let dir = path.dirname(filename).replace(/^(\/|\\)/, '');
        let base = path.join(dir, path.basename(filename, ext));

        // filter to resolved files still within the view
        views = views
            .map(view => path.resolve(view))
            .filter(view => path.resolve(view, base).indexOf(view) === 0);

        let files = [];
        for (let lang of langs) {
            let file = base + '_' + lang + ext;
            for (let view of views) {
                const filePath = path.resolve(view, file);
                files.push({ file, filePath, cached: localisedView.cache[filePath] });
            }
        }
        return files;
    },

    existsFn: fs.exists,

    getFirstExistingFile(files, useCache, done) {
        const tryNextFile = () => {
            while(files.length) {
                let { file, filePath, cached } = files.shift();
                if (cached === false) continue;
                if (cached === true) return done(file);
                return localisedView.existsFn(filePath, exists => {
                    if (useCache) localisedView.cache[filePath] = exists;
                    if (!exists) return tryNextFile();
                    done(file);
                });
            }
            done();
        };

        tryNextFile();
    },

    mixin(Parent, views, translator, nunjucksEnv, options) {
        return class LocalisedView extends Parent {
            render(opts, cb) {
                if (!this.path) return super.render(opts, cb);

                let langs = translator.getLanguages({ lang: opts.lang });

                let files = localisedView.getLocalisedFileList(this.path, this.ext, views, langs);

                localisedView.getFirstExistingFile(files, !options.noCache, file => {
                    if (file) return nunjucksEnv.render(file, opts, cb);
                    super.render(opts, cb);
                });
            }
        };
    },

    setup(app, translator, options) {
        // check for nunjucks engine environment
        const nunjucksEnv = app.get('nunjucksEnv');
        if (!nunjucksEnv) return;

        // get file loader search paths
        let views;
        if (nunjucksEnv.loaders && nunjucksEnv.loaders[0].searchPaths) {
            views = nunjucksEnv.loaders[0].searchPaths;
        }
        views = views || app.get('views') || ['.'];
        if (!Array.isArray(views)) views = [ views ];

        // overwrite View engine
        const View = app.get('view');
        const LocalisedView = localisedView.mixin(View, views, translator, nunjucksEnv, options);
        app.set('view', LocalisedView);
    }
};

module.exports = localisedView;
