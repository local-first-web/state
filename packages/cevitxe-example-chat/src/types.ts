import { CSSObject } from '@emotion/core'

export interface State {
  messages: string[]
}

export type Stylesheet = { [k: string]: CSSObject }
