import { Middleware } from 'redux'

import debug from 'debug'
const log = debug('cevitxe:todo:logger')

export const logger: Middleware = store => next => action => {
  log('action', action)
  log('prev state', store.getState())

  const result = next(action)

  log('next state', store.getState())

  return result
}
