var assert = require('assert');

module.exports = {
  '_some.thing': '#custom-value', // "_" prefix means don't treat key as a path
  'some.actual.thing': 'ok',
  '_some.other.thing': function container (get) { // should not evaluate
    throw new Error('this is not happening');
  }
}