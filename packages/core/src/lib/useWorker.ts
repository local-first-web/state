import { useEffect, useMemo, useRef, useReducer } from 'react'

interface State {
  result: any
  error: string
}

interface Action {
  type: string
  payload?: any
}

type WorkerFactory = () => Worker

const initialState: State = { result: null, error: '' }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'init':
      return initialState
    case 'result':
      return { result: action.payload, error: '' }
    case 'error':
      return { result: null, error: action.payload }
    default:
      throw new Error('unknown action')
  }
}

export const useWorker = (workerFactory: WorkerFactory, input: unknown) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const worker = useMemo(workerFactory, [workerFactory])
  const lastWorker = useRef<Worker>(worker)

  useEffect(() => {
    worker.onmessage = e => {
      if (e.data !== undefined) {
        if (e.data.error) dispatch({ type: 'error', payload: e.data.error })
        else dispatch({ type: 'result', payload: e.data })
      }
    }
  }, [worker])

  useEffect(() => lastWorker.current!.postMessage(input), [input])

  return state
}

export const exposeWorker = (fn: Function) => {
  onmessage = async e => {
    const { origin } = window
    let result: any
    try {
      result = fn(e.data)
      // support async iterators
      if (result[Symbol.asyncIterator]) for await (const i of result) postMessage(i, origin)
      // support regular iterators
      else if (result[Symbol.iterator]) for (const i of result) postMessage(i, origin)
      // support async or regular values
      else postMessage(await result, origin)
    } catch (e) {
      postMessage({ error: e.message }, origin)
    }
  }
}
