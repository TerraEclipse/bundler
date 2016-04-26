module.exports = {
  'some.thing[]': { // pushing to "some.thing"
    'some.key': 'some-value'
  },
  'some.thing': { // pushing to "some.thing", but it's an object
    'some.other.key': 'some-value'
  }
}