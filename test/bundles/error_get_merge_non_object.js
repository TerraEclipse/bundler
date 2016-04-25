module.exports = {
  _bundles: [
    {
      'some.thing{}': { // object literal
        'some-key': true
      }
    }
  ],
  'some.thing{}': new Date() // NOT an object literal
}