import { Clock } from '../types'

export const lessOrEqual = (clock1: Clock, clock2: Clock) =>
  clock1
    .keySeq()
    .concat(clock2.keySeq())
    .map(key => clock1.get(key, 0) <= clock2.get(key, 0))
    .reduce(allAreTrue, true)

const allAreTrue = (acc: boolean, d: boolean) => acc && d
