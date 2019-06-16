import { MiddlewareFactory } from './types'
import automerge from 'automerge'
import debug from 'debug'
const log = debug('cevitxe:todo')

export const getMiddleware: MiddlewareFactory = feed => store => next => action => {
  // console.group('cevitxe: ' + action.type)

  // before changes
  const prevState = store.getState() || automerge.init()
  log('action', action)
  log('prevState', action)

  // changes
  const result = next(action)

  // after changes
  const nextState = store.getState()

  // write actions to feed (if they're not already coming from the feed)
  if (!action.payload.cameFromFeed) {
    const changes = automerge.getChanges(prevState, nextState)
    changes.forEach(change => feed.append(JSON.stringify(change)))
  }
  return result
}
