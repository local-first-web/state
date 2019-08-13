import { Clock } from '../types'

export const lessOrEqual = (clock1: Clock, clock2: Clock) => {
  const clockSeq1 = clock1.keySeq().toJS() as string[]
  const clockSeq2 = clock2.keySeq().toJS() as string[]
  const both = clockSeq1.concat(clockSeq2)
  return both //
    .map(key => clock1.get(key, 0) <= clock2.get(key, 0))
    .reduce(allAreTrue, true)
}

const allAreTrue = (acc: boolean, d: boolean): boolean => acc && d
