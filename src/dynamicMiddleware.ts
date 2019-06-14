// This should no longer be necessary since we're creating the redux store now

import { compose, Middleware } from 'redux'

const createDynamicMiddlewares = () => {
  let allDynamicMiddlewares: Middleware[] = []

  const enhancer: Middleware = store => next => action => {
    const chain = allDynamicMiddlewares.map(middleware => middleware(store))
    return compose<Middleware>(...chain)(next)(action)
  }

  const addMiddleware = (...middlewares: Middleware[]) => {
    allDynamicMiddlewares = [...allDynamicMiddlewares, ...middlewares]
  }

  const removeMiddleware = (middleware: Middleware) => {
    const index = allDynamicMiddlewares.findIndex(d => d === middleware)

    if (index === -1) {
      console.error('Middleware does not exist!', middleware)
      return
    }

    allDynamicMiddlewares = allDynamicMiddlewares.filter(
      (_, mdwIndex) => mdwIndex !== index
    )
  }

  const resetMiddlewares = () => {
    allDynamicMiddlewares = []
  }

  return {
    enhancer,
    addMiddleware,
    removeMiddleware,
    resetMiddlewares,
  }
}

const dynamicMiddlewaresInstance = createDynamicMiddlewares()

export const cevitxeMiddleware = dynamicMiddlewaresInstance.enhancer

export const {
  addMiddleware,
  removeMiddleware,
  resetMiddlewares,
} = dynamicMiddlewaresInstance

export { createDynamicMiddlewares }
