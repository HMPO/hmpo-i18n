/* istanbul ignore file */

var glob = require('glob').glob,
    yaml = require('js-yaml'),
    path = require('path'),
    fs = require('fs'),
    callsites = require('callsites'),
    findup = require('findup'),
    deepCloneMerge = require('deep-clone-merge'),
    async = require('async');

function getcallsite(cb) {
  var paths = callsites(),
      root = path.resolve(__dirname, '../../');

  // iterate over the call stack and find the first path that is not inside the i18n-future directory
  var source = paths
    .map(function (p) { return p.getFileName(); })
    .reduce(function (src, p) {
      if (src) {
        return src;
      } else if (path.resolve(root, p).indexOf(root) < 0) {
        return p;
      }
    }, null);

    // if such a path is found, then findup from that path to a directory containing a package.json
    if (source) {
      findup(source, 'package.json', cb);
    } else {
      cb();
    }
}

module.exports = {
  load: function (options, callback) {
    if (arguments.length === 1 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    options = Object.assign({
      path: 'locales/__lng__/__ns__.__ext__'
    }, options);
    options.path = path.normalize(options.path);

    var glb = options.path
      .replace('__lng__', '+([a-zA-Z_-])')
      .replace('__ns__', '+(+([a-zA-Z_-])*(.)+([a-zA-Z_-]))')
      .replace('__ext__', '@(json|yml|yaml)');
    var rgx = options.path
      .replace(/\\/g, '\\\\') // Windows hack, noop for unix file paths
      .replace(/\./g, '\\.')
      .replace('__lng__', '([a-zA-Z_-]+)')
      .replace('__ns__', '([a-zA-Z_.-]+[a-zA-Z_]+)')
      .replace('__ext__', '(json|yml|yaml|__ext__)');
    rgx = new RegExp(rgx);

    // find language and namespace indexes in path matches
    var parts = options.path.match(rgx).slice(1);
    var lngIndex, nsIndex;
    parts.forEach(function (fragment, i) {
      if (fragment === '__lng__') lngIndex = i;
      if (fragment === '__ns__') nsIndex = i;
    });


    var dirs = [];

    function getDirs(done) {
      if (options.baseDir) {
        dirs = options.baseDir;
        if(!Array.isArray(dirs)) dirs = [ dirs ];
        return done();
      }

      getcallsite(function (err, baseDir) {
        if (err || !baseDir) {
          dirs = [ process.cwd() ];
        } else {
          dirs = [ baseDir ];
        }
        done();
      });
    }

    function sortFiles(a, b) {
      if (a.lng !== b.lng) return a.lng < b.lng ? -1 : 1;
      if (a.ns !== b.ns) return (a.ns === 'default' || a.ns < b.ns) ? -1 : 1;
      if (a.ext !== b.ext) return a.ext < b.ext ? -1 : 1;
      return 0;
    }

    var files = [];

    function findFiles(done) {
      async.forEachSeries(dirs, function(dir, done) {
        var filePath = path.resolve(dir, glb);
        glob(filePath).catch(done).then(function (filenames) {
          var dirFiles = [];
          filenames.forEach(function (filename) {
            filename = path.normalize(filename);
            var parts = filename.match(rgx).slice(1);

            var lng = parts[lngIndex];
            var ns = parts[nsIndex];
            var ext = path.extname(filename).substr(1);

            if (lng && ns) {
              filename = path.resolve(dir, filename);
              dirFiles.push({ filename, dir, lng, ns, ext });
            }
          });

          dirFiles.sort(sortFiles);

          files = files.concat(dirFiles);

          done();
        });
      }, done);
    }


    var datastore = {};

    function readFiles(done) {
      datastore = {};
      async.forEachSeries(files, function(file, done) {

        fs.readFile(file.filename, function (err, buffer) {
          if (err) return done(err);

          let data;
          try {
            if (file.ext === 'json') {
              data = JSON.parse(buffer.toString());
            }
            else if (file.ext === 'yaml' || file.ext === 'yml') {
              data = yaml.load(buffer.toString());
            } else {
              throw new Error('Unknown localisation file format: ' + file.filename);
            }
          } catch(e) {
            if (e instanceof SyntaxError || e instanceof yaml.YAMLException) {
              e.message = 'Localisation file syntax error: ' + file.filename + ': ' + e.message;
            }
            return done(e);
          }

          // make deep object based on namespace
          let namespacedObject;
          if (file.ns !== 'default') {
            namespacedObject = {};
            const parts = file.ns.split('.');
            const topPart = parts.pop();
            const top = parts.reduce((obj, part) => obj[part] = {}, namespacedObject);
            top[topPart] = data;
          } else {
            namespacedObject = data;
          }

          datastore[file.lng] = deepCloneMerge(namespacedObject, datastore[file.lng]);

          done();
        });
      }, done);
    }

    let watcher;

    function watchFiles(done) {
      if (!options.watch) return done();
      if (watcher) return done();

      var chokidar;
      try {
        chokidar = require('chokidar');
      } catch (e) {
        throw new Error('watch requires chokidar to be installed');
      }

      watcher = chokidar.watch(files.map(function (file) { return file.filename }));
      watcher.on('change', function (fullname) {
        console.log('hmpo-i18n watcher file changed: ' + fullname);
        update();
      });
      watcher.on('error', function (error) {
        console.log('hmpo-i18n watcher error: ' + error);
      });

      done();
    }
  
    function update() {
      async.series([
        getDirs,
        findFiles,
        readFiles,
        watchFiles
      ], function (err) {
        if (err) {
          if (watcher) return console.error(err);
          return callback(err);
        }
        callback(null, datastore);
      });
    }
  
    update();
  }
};
