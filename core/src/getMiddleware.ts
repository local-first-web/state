import automerge from 'automerge'
import debug from 'debug'
import { MiddlewareFactory } from './types'

const log = debug('cevitxe:todo')

export const getMiddleware: MiddlewareFactory = feed => store => next => action => {
  // before changes
  const prevState = store.getState() || automerge.init()
  log('action', action)
  log('prevDoc', prevState)

  // changes
  const result = next(action)

  // after changes
  const nextState = store.getState()

  // write actions to feed (if they're not already coming from the feed)
  if (!action.payload.cameFromFeed) {
    const changes = automerge.getChanges(prevState, nextState)
    const message = { clock: nextState.map, changes }
    feed.append(JSON.stringify(message))
  }

  return result
}
