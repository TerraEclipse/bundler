var bundler = require('../').default;
var assert = require('assert');

describe('examples', function () {
  it('alter', function () {
    var app = bundler(require('./bundles/example_alter'));
    var val = app.get('some.key');
    assert.equal(val, 'altered');
    var otherVal = app.get('some.other.key');
    assert.equal(otherVal, 'fifth');
  });
  it('container', function () {
    var app = bundler(require('./bundles/example_container'));
    var val = app.get('some.thing');
    var otherVal = app.get('some.other.thing');
    assert.equal(val['some-key'], 'some-value');
    assert.deepEqual(val, otherVal);
  });
  it('merge', function () {
    var app = bundler(require('./bundles/example_merge'));
    var val = app.get('some.thing');
    assert.deepEqual(val, {a: 1, b: 4, c: 10, d: {e: 'h', g: true}});
  });
  it('meta', function () {
    var app = bundler(require('./bundles/example_meta'));
    assert.throws(function () {
      app.get('_some.thing');
    }, /path `_some.thing` is undefined/);
    assert.throws(function () {
      app.get('_some.other.thing');
    }, /path `_some.other.thing` is undefined/);
    var val = app.get('some.actual.thing');
    assert.equal(val, 'ok');
  });
  it('ns', function () {
    var app = bundler(require('./bundles/example_ns'));
    var val = app.get('imports.yet.another.path');
    assert.equal(typeof val, 'number');
    var otherVal = app.get('something-double-nested:yet.another.path');
    assert.equal(val, otherVal);
    var topLevelVal = app.get('top.level.path');
    assert.equal(topLevelVal, 'top-level-value');
    var nestedVal = app.get('something-nested:some.path');
    assert.equal(nestedVal, 'some-value altered altered!');
    var peerVal = app.get('something-else-nested:get.from.peer');
    assert.equal(peerVal, 'some-value altered altered!');
    var exported = app.export();
    assert.deepEqual(exported, {
      top: {
        level: {
          path: 'top-level-value'
        }
      },
      imports: {
        yet: {
          another: {
            path: val
          }
        }
      }
    });
  });
  it('pointer', function () {
    var app = bundler(require('./bundles/example_pointer'));
    var val = app.get('some.other.path');
    assert.equal(val, 'nope');
    var importVal = app.get('imports.some.path');
    assert.equal(importVal, 'ok');
  });
  it('push', function () {
    var app = bundler(require('./bundles/example_push'));
    var val = app.get('some.thing');
    assert.deepEqual(val, ['zero', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth']);
  });
});