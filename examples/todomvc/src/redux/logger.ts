import { Middleware } from 'redux'

export const logger: Middleware = store => next => action => {
  console.group(action.type)
  console.info('dispatching', JSON.stringify(action))
  console.log('prev state', JSON.stringify(store.getState()))
  let result = next(action)
  console.log('next state', JSON.stringify(store.getState()))
  console.groupEnd()
  return result
}
