const ts_preset = require('ts-jest/jest-preset')
const mongo_preset = require('@shelf/jest-mongodb/jest-preset')
const R = require('ramda')
const presets = R.mergeRight(ts_preset, mongo_preset)

module.exports = {
  ...presets,
  testMatch: ['**/src/*.test.ts'],
}
