module.exports = {
  _bundles: [
    {
      'some.thing[4]': 'fifth'
    }
  ],
  'some.thing[15]': ['sixth'],
  'some.thing[-2]': [
    'first', 'second'
  ],
  'some.thing': ['zero'],
  'some.thing[]': function container (get) {
    return ['third', 'fourth'];
  }
}