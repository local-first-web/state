import { MiddlewareFactory } from './types'
import automerge, { DocSet } from 'automerge'
import debug from 'debug'
import { DOC_ID } from './constants'
const log = debug('cevitxe:todo')

export const getMiddleware: MiddlewareFactory = feed => store => next => action => {
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

  // write actions to feed (if they're not already coming from the feed)
  if (!action.payload.cameFromFeed) {
    const changes = automerge.getChanges(prevDoc, nextDoc)
    const message = {
      docId: DOC_ID,
      clock: nextDoc.map,
      changes,
    }

    feed.append(JSON.stringify(message)
  }

  return result
}
