import { KeySet } from '../../@types/KeySet'
export const intersection = (a: KeySet = [], b: KeySet = []) => a.filter(key => b.includes(key))
