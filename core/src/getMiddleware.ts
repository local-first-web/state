import automerge, { DocSet } from 'automerge'
import debug from 'debug'
import { MiddlewareFactory, Message } from './types'

const log = debug('cevitxe:todo')

export const getMiddleware: MiddlewareFactory = docSet => store => next => action => {
  // before changes
  const prevState = store.getState() || automerge.init()
  log('action', action)
  log('prevDoc', prevState)

  // changes
  const result = next(action)

  // after changes
  const nextState = store.getState()

  const changes = automerge.getChanges(prevState, nextState)
  const message = { clock: nextState.map, changes }

  if (!action.payload.cameFromFeed && docSet) {
    log('calling setDoc', nextState)
    docSet.set(nextState)
    log('calling feed.append')
    //feed.append(JSON.stringify(message))
  }

  return result
}
