import { KeySet } from '../../@types/KeySet'

export const deduplicate = (acc: KeySet, key: string) => (acc.includes(key) ? acc : acc.concat(key))
