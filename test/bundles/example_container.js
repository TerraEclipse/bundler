var assert = require('assert');

module.exports = {
  'some.thing': function container (get) { // functions named "container" get evaluated
    assert.equal(typeof this.get, 'function');
    return get('some.other.thing'); // get another path (should resolve to another eval'ed container)
  },
  'some.other.thing': function container (get) {
    return {
      'some-key': 'some-value',
      rand: Math.random()
    }
  }
}