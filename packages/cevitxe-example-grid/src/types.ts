import { CSSObject } from '@emotion/core'
import { JSONSchema7 } from 'json-schema'

export type Stylesheet = { [k: string]: CSSObject }

export type GridState = {
  rows: {
    [x: string]: any
  }
  schema: JSONSchema7
}
