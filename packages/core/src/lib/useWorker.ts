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

const initialState: State = { result: null, error: null }

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'init':
      return initialState
    case 'result':
      return { result: action.payload, error: null }
    case 'error':
      return { result: null, error: action.payload }
    default:
      throw new Error('unknown action')
  }
}

export const useWorker = (workerFactory: WorkerFactory, input: unknown) => {
  const [state, dispatch] = useReducer(reducer, initialState)
  const worker = useMemo(workerFactory, [workerFactory])
  const lastWorker = useRef<Worker>(null)

  useEffect(() => {
    lastWorker.current = worker
    worker.onmessage = e => {
      if (e.data !== undefined) {
        if (e.data.error) dispatch({ type: 'error', payload: e.data.error })
        else dispatch({ type: 'result', payload: e.data })
      }
    }
  }, [worker])

  useEffect(() => lastWorker.current.postMessage(input), [input])

  return state
}
