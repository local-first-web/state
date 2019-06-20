const { defaults } = require('ts-jest/presets')
// const { compilerOptions } = require('./tsconfig')
// const path = require('path')

module.exports = {
  ...defaults,
  // moduleDirectories: ['node_modules', path.join(__dirname, 'src')],
  // moduleNameMapper: {},
  moduleFileExtensions: ['js', 'jsx', 'json', 'node', 'ts', 'tsx'],
  testMatch: ['**/*.test.ts'],
}
