import { Middleware } from 'redux'
import { save } from './save'

type Options = {
  key: string
}

export const middleware = ({ key }: Options): Middleware => {
  return store => next => action => {
    const result = next(action)
    const nextState = store.getState()
    save(key, nextState)
    return result
  }
}
