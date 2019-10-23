import { Map } from 'immutable'
import * as R from 'ramda'
import { PlainClock, Clock } from './types'

// temporary adapter
export const mergeClocks_old = (oldClock: Clock, clock: Clock) => {
  // convert to plain
  const _oldClock = oldClock.toJS() as PlainClock
  const _clock = clock.toJS() as PlainClock
  // merge
  const _newClock = mergeClocks(_oldClock, _clock)
  // convert back
  return Map(_newClock) as Clock
}

export function mergeClocks(_oldClock: PlainClock, _clock: PlainClock): PlainClock {
  const largestWins = (x: number = 0, y: number = 0): number => Math.max(x, y)
  return R.mergeWith(largestWins, _oldClock, _clock)
}

// temporary adapter
export const isMoreRecent_old = (clock1: Clock, clock2: Clock) => {
  // coerce to plain JS
  const _clock1 = clock1.toJS() as PlainClock
  const _clock2 = clock2.toJS() as PlainClock

  return isMoreRecent(_clock1, _clock2)
}

export const isMoreRecent = (clock1: PlainClock, clock2: PlainClock) => {
  const actors = Object.keys({ ...clock1, ...clock2 })
  const clockIsMoreRecent = (actorId: string) => (clock1[actorId] || 0) > (clock2[actorId] || 0)
  return actors.some(clockIsMoreRecent)
}
