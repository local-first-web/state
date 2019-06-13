import Automerge from 'automerge'

export const save = <T>(key: string, state: T): void => {
  const history = Automerge.save(state)
  localStorage.setItem(key, history)
}
