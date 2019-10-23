import { Map } from 'immutable'
import * as R from 'ramda'
import { PlainClock, Clock } from './types'

// temporary adapter
export const mergeClocks = (oldClock: Clock, clock: Clock) => {
  // convert to plain
  const _oldClock = oldClock.toJS() as PlainClock
  const _clock = clock.toJS() as PlainClock
  // merge
  const _newClock = mergePlainClocks(_oldClock, _clock)
  // convert back
  return Map(_newClock) as Clock
}

export function mergePlainClocks(_oldClock: PlainClock, _clock: PlainClock): PlainClock {
  const largestWins = (x: number = 0, y: number = 0): number => Math.max(x, y)
  return R.mergeWith(largestWins, _oldClock, _clock)
}
