import { Change } from './types'
import { APPLY_CHANGE } from './constants'

export const actions = {
  applyChange: (change: Change) => ({
    type: APPLY_CHANGE,
    payload: { change },
  }),
}
