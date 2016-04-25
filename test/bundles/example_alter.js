var assert = require('assert');

module.exports = {
  _bundles: [
    {
      'some.key': 'default value',
      'some.other.key': 'first',
      '@some.other.key[20]': function alter (val) {
        assert.equal(val, 'fourth');
        return 'fifth';
      }
    }
  ],
  '@some.key': 'altered', // "@" prefix alters the value
  '@some.other.key[10]': function alter (val) { // function named "alter" gets evaluated
    assert.equal(val, 'third');
    return 'fourth';
  },
  '@some.other.key[-1]': function alter (val) {
    assert.equal(val, 'first');
    assert.equal(typeof this.get, 'function');
    return 'second';
  },
  '@some.other.key': function alter (val) {
    assert.equal(val, 'second');
    return 'third';
  }
}