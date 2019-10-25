import * as R from 'ramda'
import { Clock } from './types'

/**
 * A vector clock is a map, where the keys are the actorIds of all actors that have been active on a
 * particular document, and the values are the most recent sequence number for that actor. The
 * sequence number starts at 1 and increments every time an actor makes a change.
 */

/** Merges the clocks, keeping the maximum sequence number for each node */
export function mergeClocks(oldClock: Clock, newClock: Clock): Clock {
  const largestWins = (x: number = 0, y: number = 0): number => Math.max(x, y)
  return R.mergeWith(largestWins, oldClock, newClock)
}
/** Returns true if there are any actors in clock1 that have more recent updates than in clock2 */
export const isMoreRecent = (clock1: Clock, clock2: Clock) => {
  const actors = Object.keys({ ...clock1, ...clock2 })
  const clockIsMoreRecent = (actorId: string) => (clock1[actorId] || 0) > (clock2[actorId] || 0)
  return actors.some(clockIsMoreRecent)
}

export const EMPTY_CLOCK: Clock = {}
