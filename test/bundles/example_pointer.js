module.exports = {
  _bundles: [
    {
      _ns: 'something-nested',
      'some.path': function container (get) {
        return get('some.other.path');
      },
      'some.other.path': 'ok'
    }
  ],
  'imports.some.path': '#something-nested:some.path',
  'some.other.path': 'nope'
}