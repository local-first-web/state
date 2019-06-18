import { MiddlewareFactory } from './types'
import automerge, { DocSet } from 'automerge'
import debug from 'debug'
import { DOC_ID } from './constants'
import { CevitxeConnection } from './connection'
const log = debug('cevitxe:todo')

export const getMiddleware: MiddlewareFactory = feed => store => next => action => {
  // console.group('cevitxe: ' + action.type)

  // before changes
  const prevState = store.getState() || new DocSet()
  const prevDoc = prevState.getDoc(DOC_ID) || automerge.init()
  log('action', action)
  log('prevDoc', prevDoc)

  // changes
  const result = next(action)

  // after changes
  const nextState = store.getState()
  const nextDoc = nextState.getDoc(DOC_ID)

  // Maybe we don't need middleware any more since DocSet already responds to changes?

  // // write actions to feed (if they're not already coming from the feed)
  // if (!action.payload.cameFromFeed) {
  //   // const changes = automerge.getChanges(prevDoc, nextDoc)
  //   // changes.forEach(change => feed.append(JSON.stringify(change)))

  //   const connections: CevitxeConnection[] = []
  //   connections.forEach(connection => {
  //     connection.docSet.setDoc(DOC_ID, nextDoc)
  //   })
  // }
  return result
}
