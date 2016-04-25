module.exports = {
  'some.thing[]': { // pushing to "some.thing"
    'some.key': 'some-value'
  },
  'some.thing{}': { // merging to "some.thing", but it's an array
    'some.other.key': 'some-value'
  }
}