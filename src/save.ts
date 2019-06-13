import automerge from 'automerge'

export const save = <T>(key: string, state: T): void => {
  const history = automerge.save(state)
  localStorage.setItem(key, history)
}
