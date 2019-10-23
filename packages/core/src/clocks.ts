import * as R from 'ramda'
import { PlainClock, Clock } from './types'

export function mergeClocks(_oldClock: PlainClock, _clock: PlainClock): PlainClock {
  const largestWins = (x: number = 0, y: number = 0): number => Math.max(x, y)
  return R.mergeWith(largestWins, _oldClock, _clock)
}

export const isMoreRecent = (clock1: PlainClock, clock2: PlainClock) => {
  const actors = Object.keys({ ...clock1, ...clock2 })
  const clockIsMoreRecent = (actorId: string) => (clock1[actorId] || 0) > (clock2[actorId] || 0)
  return actors.some(clockIsMoreRecent)
}
