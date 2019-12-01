import { KeySet } from '../types'

export const deduplicate = (acc: KeySet, key: string) => (acc.includes(key) ? acc : acc.concat(key))
