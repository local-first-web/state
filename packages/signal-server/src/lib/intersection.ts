import { KeySet } from '../types'
export const intersection = (a: KeySet = [], b: KeySet = []) => a.filter(key => b.includes(key))
