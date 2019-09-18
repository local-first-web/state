import { Map } from 'immutable'
type Clock = Map<string, number>

export const lessOrEqual = (clock1: Clock, clock2: Clock) => {
  const clockIsLessOrEqual = (key: string) => clock1.get(key, 0) <= clock2.get(key, 0)
  const clockSeq1 = clock1.keySeq().toJS() as string[]
  const clockSeq2 = clock2.keySeq().toJS() as string[]
  const both = clockSeq1.concat(clockSeq2)
  return both.map(clockIsLessOrEqual).reduce(allTrue, true)
}

const allTrue = (acc: boolean, d: boolean): boolean => acc && d
