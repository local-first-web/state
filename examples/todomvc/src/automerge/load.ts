import Automerge from 'automerge'

export const load = <T>(key: string): T | null => {
  const history = localStorage.getItem(key)
  return history ? Automerge.load(history) : null
}
