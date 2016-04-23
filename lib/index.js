'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = bundler;

require('babel-polyfill');

var _nDeepMerge = require('n-deep-merge');

var _nDeepMerge2 = _interopRequireDefault(_nDeepMerge);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function bundler(bundle) {
  var app = {
    _pathCache: {},
    _valCache: {},
    parsePath: function parsePath(p, bundle) {
      var alterMatch = p.match(/^@(.*)(\[(\-?\d*)\])?$/);
      if (alterMatch) {
        return {
          pointer: alterMatch[1],
          op: 'alter',
          weight: alterMatch[2] ? parseInt(alterMatch[2], 10) : 0,
          value: bundle[p],
          bundle: bundle
        };
      }
      var pushMatch = p.match(/^(.*)\[(\-?\d*)\]$/);
      if (pushMatch) {
        return {
          pointer: pushMatch[1],
          op: 'push',
          weight: pushMatch[2] ? parseInt(pushMatch[2], 10) : 0,
          value: bundle[p],
          bundle: bundle
        };
      }
      var mergeMatch = p.match(/^(.*)\{(\-?\d*)\}$/);
      if (mergeMatch) {
        return {
          pointer: mergeMatch[1],
          op: 'merge',
          weight: mergeMatch[2] ? parseInt(mergeMatch[2], 10) : 0,
          value: bundle[p],
          bundle: bundle
        };
      }
      if (p.charAt(0) === '_') return null;
      return {
        pointer: p,
        op: 'set',
        value: bundle[p],
        bundle: bundle
      };
    },
    parseBundle: function parseBundle(bundle) {
      if (bundle['_bundles']) {
        bundle['_bundles'].forEach(function (bundle) {
          app.parseBundle(bundle);
        });
      }
      Object.keys(bundle).forEach(function (p) {
        var parsed = app.parsePath(p, bundle);
        if (parsed) {
          app.addPathCache(parsed);
        }
      });
    },
    addPathCache: function addPathCache(parsed) {
      if (typeof app._pathCache[parsed.pointer] === 'undefined') {
        app._pathCache[parsed.pointer] = [];
      }
      app._pathCache[parsed.pointer].push(parsed);
    },
    getPathCache: function getPathCache(p) {
      var paths = app._pathCache[p];
      if (!paths) return [];
      // order paths by op
      paths.sort(function (a, b) {
        if (a.op === 'push' && b.op === 'merge' || b.op === 'push' && a.op === 'merge') {
          var err = new Error('cannot push and merge to same path');
          err.a = a;
          err.b = b;
          throw err;
        }
        if (a.op === 'set' && b.op === 'set') {
          var _err = new Error('cannot set path twice');
          _err.a = a;
          _err.b = b;
          throw _err;
        }
        if (a.op === 'set' && b.op !== 'set') return -1;
        if (b.op === 'set' && a.op !== 'set') return 1;
        if (a.op === 'alter' && b.op !== 'alter') return 1;
        if (b.op === 'alter' && a.op !== 'alter') return -1;
        if (a.weight < b.weight) return -1;
        if (b.weight < a.weight) return 1;
        return 0;
      });
      return paths;
    },
    resetCache: function resetCache() {
      app._pathCache = {};
      app._valCache = {};
    },
    addValCache: function addValCache(p, val) {
      app._valCache[p] = val;
    },
    getValCache: function getValCache(p) {
      return app._valCache[p];
    },
    get: function get(p) {
      var cached = app.getValCache(p);
      if (typeof cached !== 'undefined') {
        return cached;
      }
      var paths = app.getPathCache(p);
      if (!paths.length) {
        var err = new Error('path not exported');
        err.path = p;
        throw err;
      }
      var val = null;
      paths.forEach(function (path) {
        var tmp = app.evalContainer(path.value);
        if (typeof tmp === 'undefined') {
          var _err2 = new Error('undefined export');
          _err2.path = path;
          throw _err2;
        }
        switch (path.op) {
          case 'set':
            val = tmp;
            break;
          case 'push':
            if (!val) val = [];
            val.push(tmp);
            break;
          case 'merge':
            if (!val) val = {};
            if (toString.call(val) !== '[object Object]' || toString.call(tmp) !== '[object Object]') {
              var _err3 = new Error('cannot merge non-object-literal');
              _err3.val = val;
              _err3.tmp = tmp;
              _err3.path = path;
              throw _err3;
            }
            val = (0, _nDeepMerge2.default)(val, tmp);
            break;
          case 'alter':
            if (typeof tmp === 'function') {
              val = tmp.call(app, val);
            } else val = tmp;
            break;
        }
      });
      app.addValCache(p, val);
      return val;
    },
    evalContainer: function evalContainer(orig) {
      return typeof orig === 'function' && orig.name === 'container' ? orig.call(app, app.get) : orig;
    }
  };

  app.parseBundle(bundle);

  return app;
}