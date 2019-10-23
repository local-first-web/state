import * as R from 'ramda'
import { Clock } from './types'

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
