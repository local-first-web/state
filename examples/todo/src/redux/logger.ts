import { Middleware } from 'redux'

import debug from 'debug-deluxe'
const log = debug('cevitxe:todo')

export const logger: Middleware = store => next => action => {
  log.groupCollapsed(action.type)
  log('action', action)
  log('prev state', store.getState())

  const result = next(action)

  log('next state', store.getState())
  log.groupEnd()

  return result
}
