module.exports = {
  _bundles: [
    {
      _ns: 'something-nested',
      'some.path': 'some-value'
    },
    {
      _ns: 'something-else-nested',
      _bundles: [
        {
          _ns: 'something-double-nested',
          'yet.another.path': function container (get) {
            return Math.random();
          },
          '@something-nested:some.path': function alter (val) {
            return val + ' altered';
          }
        }
      ],
      'some.other.path': 'some-other-value',
      'get.from.peer': function container (get) {
        return get('something-nested:some.path');
      }
    }
  ],
  'imports.yet.another.path': '#something-double-nested:yet.another.path',
  'top.level.path': 'top-level-value',
  '@something-nested:some.path': function alter (val) {
    return val + ' altered!'
  }
}