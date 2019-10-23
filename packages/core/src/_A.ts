import { Map } from 'immutable'
import A from 'automerge'

type Clock = Map<string, number>

// TODO: Submit these to Automerge
export const _A = {
  ...A,
  getMissingChanges: (ourDoc: A.Doc<any>, theirClock: A.Clock): A.Change[] => {
    if (theirClock === undefined) return []
    const ourState = A.Frontend.getBackendState(ourDoc)
    return A.Backend.getMissingChanges(ourState!, theirClock)
  },
  getClock: (doc: A.Doc<any>): Clock => {
    const state = A.Frontend.getBackendState(doc) as any // BackendState doesn't have a public API
    return state.getIn(['opSet', 'clock']) as Clock
  },
}
