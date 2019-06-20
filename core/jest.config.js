const { pathsToModuleNameMapper } = require('ts-jest/utils')
const { compilerOptions } = require('../tsconfig')
const { defaults } = require('ts-jest/presets')

module.exports = {
  ...defaults,
  // moduleDirectories: ['node_modules', path.join(__dirname, 'src')],
  // moduleNameMapper: {},
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths /*, { prefix: '<rootDir>/' } */),
}
