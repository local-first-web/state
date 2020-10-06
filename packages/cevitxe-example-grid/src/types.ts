import { JSONSchema7 } from 'json-schema'

export type GridState = {
  rows: {
    [x: string]: any
  }
  schema: JSONSchema7
}
