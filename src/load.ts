import automerge from 'automerge'

export const load = <T>(key: string): T | null => {
  const history = localStorage.getItem(key)
  return history ? automerge.load(history) : null
}
