var bundler = require('../').default;
var assert = require('assert');

describe('errors', function () {
  it('alter undefined', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_alter_undefined'));
    }, /cannot alter undefined path `some.thing`/);
  });
  it('get merge non-object', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_get_merge_non_object'));
      app.get('some.thing');
    }, /cannot merge non-object-literal `some.thing`/);
  });
  it('get path undefined', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_get_path_undefined'));
      app.get('some.undefined.thing');
    }, /path `some.undefined.thing` is undefined/);
  });
  it('get undefined value', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_get_undefined_value'));
    }, /undefined value for `some.thing`/);
  });
  it('get undefined value container', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_get_undefined_value_container'));
      app.get('some.thing');
    }, /undefined value for `some.thing`/);
  });
  it('pointer undefined', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_pointer_undefined'));
    }, /cannot point to undefined path `nothing`/);
  });
  it('push + merge', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_push_merge'));
    }, /cannot push and merge to same path `some.thing`/);
  });
  it('get push non-array', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_push_non_array'));
      app.get('some.thing');
    }, /cannot push to non-array `some.thing`/);
  });
  it('set path twice', function () {
    assert.throws(function () {
      var app = bundler(require('./bundles/error_set_path_twice'));
    }, /cannot set path twice `some.thing`/);
  });
});