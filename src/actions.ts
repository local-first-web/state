import { Change } from './types'
import { APPLY_CHANGE_FROM_FEED } from './constants'

export const actions = {
  applyChange: (change: Change) => ({
    type: APPLY_CHANGE_FROM_FEED,
    payload: { change, cameFromFeed: true },
  }),
}
