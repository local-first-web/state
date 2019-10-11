import { Map } from 'immutable'
type Clock = Map<string, number>

export const isMoreRecent = (clock1: Clock, clock2: Clock) => !lessOrEqual(clock1, clock2)

export const lessOrEqual = (clock1: Clock, clock2: Clock) => {
  // coerce to plain JS
  clock1 = clock1.toJS ? (clock1.toJS() as Clock) : clock1
  clock2 = clock2.toJS ? (clock2.toJS() as Clock) : clock1

  // get a list of all the keys
  const actors1 = Object.keys(clock1)
  const actors2 = Object.keys(clock2)

  const allActors = actors1.concat(actors2) // not worth the effort of deduplicating

  // @ts-ignore
  const clockIsLessOrEqual = (key: string) => (clock1[key] || 0) <= (clock2[key] || 0)
  return allActors.map(clockIsLessOrEqual).reduce(allTrue, true)
}

const allTrue = (acc: boolean, d: boolean): boolean => acc && d
