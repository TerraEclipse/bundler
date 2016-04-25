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
      var alterMatch = p.match(/^@(?:(.+):)?([^\[]+)(\[(\-?\d*)\])?$/);
      if (alterMatch) {
        return {
          ns: alterMatch[1] || bundle._ns,
          pointer: alterMatch[2],
          op: 'alter',
          weight: alterMatch[3] ? parseInt(alterMatch[3].replace(/\[|\]/g, ''), 10) : 0,
          value: bundle[p],
          bundle: bundle,
          get: function get(p) {
            return app.get(p, bundle._ns);
          }
        };
      }
      var pushMatch = p.match(/^(?:(.+):)?([^\[]+)\[(\-?\d*)\]$/);
      if (pushMatch) {
        return {
          ns: pushMatch[1] || bundle._ns,
          pointer: pushMatch[2],
          op: 'push',
          weight: pushMatch[3] ? parseInt(pushMatch[3].replace(/\[|\]/g, ''), 10) : 0,
          value: bundle[p],
          bundle: bundle,
          get: function get(p) {
            return app.get(p, bundle._ns);
          }
        };
      }
      var mergeMatch = p.match(/^(?:(.+):)?([^\{]+)\{(\-?\d*)\}$/);
      if (mergeMatch) {
        return {
          ns: mergeMatch[1] || bundle._ns,
          pointer: mergeMatch[2],
          op: 'merge',
          weight: mergeMatch[3] ? parseInt(mergeMatch[3].replace(/\{|\}/g, ''), 10) : 0,
          value: bundle[p],
          bundle: bundle,
          get: function get(p) {
            return app.get(p, bundle._ns);
          }
        };
      }
      if (p.charAt(0) === '_') return null;
      var setMatch = p.match(/^(?:(.+):)?(.*)$/);
      if (!setMatch) {
        var err = new Error('invalid path `' + p + '`');
        throw err;
      }
      return {
        ns: setMatch[1] || bundle._ns,
        pointer: setMatch[2],
        op: 'set',
        value: bundle[p],
        bundle: bundle,
        get: function get(p) {
          return app.get(p, bundle._ns);
        }
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
      var p = parsed.ns ? parsed.ns + ':' + parsed.pointer : parsed.pointer;
      if (typeof app._pathCache[p] === 'undefined') {
        app._pathCache[p] = [];
      }
      app._pathCache[p].push(parsed);
    },
    getPathCache: function getPathCache(p) {
      return app._pathCache[p] || [];
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
    get: function get(p, defaultNs) {
      if (!defaultNs) defaultNs = bundle._ns;
      if (defaultNs && p.indexOf(':') === -1) {
        p = defaultNs + ':' + p;
      }

      var cached = app.getValCache(p);
      if (typeof cached !== 'undefined') {
        return cached;
      }
      var paths = app.getPathCache(p);
      if (!paths.length) {
        var err = new Error('path `' + p + '` is undefined');
        err.path = p;
        throw err;
      }
      var val = null;
      paths.forEach(function (path) {
        var tmp = app.getValue(path);
        if (typeof tmp === 'undefined') {
          var _err = new Error('undefined value for `' + p + '`');
          _err.path = path;
          throw _err;
        }
        switch (path.op) {
          case 'set':
            val = tmp;
            break;
          case 'push':
            if (!val) val = [];
            val = val.concat(tmp);
            break;
          case 'merge':
            if (!val) val = {};
            if (toString.call(val) !== '[object Object]' || toString.call(tmp) !== '[object Object]') {
              var _err2 = new Error('cannot merge non-object-literal `' + p + '`');
              _err2.val = val;
              _err2.tmp = tmp;
              _err2.path = path;
              throw _err2;
            }
            val = (0, _nDeepMerge2.default)(val, tmp);
            break;
          case 'alter':
            if (typeof tmp === 'function' && tmp.name === 'alter') {
              val = tmp.call(app, val);
            } else val = tmp;
            break;
        }
      });
      app.addValCache(p, val);
      return val;
    },
    getValue: function getValue(path) {
      var pointerValue = app.isPointer(path.value);
      if (pointerValue) {
        return path.get(pointerValue);
      }
      return typeof path.value === 'function' && path.value.name === 'container' ? path.value.call(app, path.get) : path.value;
    },
    validatePathCache: function validatePathCache() {
      Object.keys(app._pathCache).forEach(function (p) {
        var hasSet = false;
        var hasMerge = false;
        var hasPush = false;
        var hasAlter = false;
        var paths = app._pathCache[p];
        // order paths by op
        paths.sort(function (a, b) {
          if (a.op === 'set' && b.op !== 'set') return -1;
          if (b.op === 'set' && a.op !== 'set') return 1;
          if (a.op === 'alter' && b.op !== 'alter') return 1;
          if (b.op === 'alter' && a.op !== 'alter') return -1;
          if (a.weight < b.weight) return -1;
          if (b.weight < a.weight) return 1;
          return 0;
        });
        paths.forEach(function (path) {
          if (typeof path.value === 'undefined') {
            var err = new Error('undefined value for `' + p + '`');
            err.path = path;
            throw err;
          }
          switch (path.op) {
            case 'set':
              if (hasSet) {
                var _err3 = new Error('cannot set path twice `' + p + '`');
                _err3.path = p;
                _err3.paths = app._pathCache[p];
                throw _err3;
              }
              hasSet = true;
              break;
            case 'push':
              if (hasMerge) {
                var _err4 = new Error('cannot push and merge to same path `' + p + '`');
                _err4.path = p;
                _err4.paths = app._pathCache[p];
                throw _err4;
              }
              hasPush = true;
              break;
            case 'merge':
              if (hasPush) {
                var _err5 = new Error('cannot push and merge to same path `' + p + '`');
                _err5.path = p;
                _err5.paths = app._pathCache[p];
                throw _err5;
              }
              hasMerge = true;
              break;
            case 'alter':
              hasAlter = true;
              break;
          }
          var pointerValue = app.isPointer(path.value);
          if (pointerValue && typeof app._pathCache[pointerValue] === 'undefined') {
            var _err6 = new Error('cannot point to undefined path `' + pointerValue + '`');
            _err6.path = p;
            _err6.paths = app._pathCache[p];
            _err6.pointer = pointerValue;
            throw _err6;
          }
        });
        if (hasAlter && !(hasSet || hasMerge || hasPush)) {
          var err = new Error('cannot alter undefined path `' + p + '`');
          err.path = p;
          err.paths = app._pathCache[p];
          throw err;
        }
      });
    },
    isPointer: function isPointer(val) {
      if (typeof val !== 'string') return false;
      var pointerMatch = val.match(/^#(.*)$/);
      return pointerMatch ? pointerMatch[1] : false;
    }
  };

  app.parseBundle(bundle);
  app.validatePathCache();

  return app;
}