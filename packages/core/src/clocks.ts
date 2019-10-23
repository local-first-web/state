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

export const isMoreRecent_old = (clock1: Clock, clock2: Clock) => {
  // coerce to plain JS
  const _clock1 = clock1.toJS() as PlainClock
  const _clock2 = clock2.toJS() as PlainClock

  return isMoreRecent(_clock1, _clock2)
}

export const isMoreRecent = (clock1: PlainClock, clock2: PlainClock) => {
  // get a list of all the keys
  const actors1 = Object.keys(clock1)
  const actors2 = Object.keys(clock2)

  // there will be duplicates, but it's not worth the effort of deduplicating
  const allActors = actors1.concat(actors2)

  const clockIsLessOrEqual = (key: string) => (clock1[key] || 0) <= (clock2[key] || 0)
  return !allActors.map(clockIsLessOrEqual).reduce(allTrue, true)
}

const allTrue = (acc: boolean, d: boolean): boolean => acc && d
