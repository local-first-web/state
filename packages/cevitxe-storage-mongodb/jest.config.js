import ts_preset from 'ts-jest/jest-preset'
import mongo_preset from '@shelf/jest-mongodb/jest-preset'
import * as R from 'ramda'
module.exports = R.mergeRight(ts_preset, mongo_preseet)
