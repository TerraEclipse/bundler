module.exports = {
  _bundles: [
    {
      'some.thing{4}': { // suffix "{}" means, merge this object (with optional weight)
        'b': 4,
        'd': {
          'e': 'f'
        }
      }
    }
  ],
  'some.thing{15}': {
    'd': {
      'e': 'h',
      'g': true
    }
  },
  'some.thing{-2}': {
    'a': 0,
    'c': 10
  },
  'some.thing': {
    'a': 1,
    'b': 3
  }
}