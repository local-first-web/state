import { getReducer } from './getReducer'
import { repoFromSnapshot } from './repoTestHelpers'
import { ProxyReducer, ChangeManifest } from './types'

describe('getReducer', () => {
  describe('single change function', () => {
    const proxyReducer: ProxyReducer = (state, { type, payload }) => {
      switch (type) {
        case 'WHATEVER':
          return (s) => {
            s.settings.foo = payload
          }
        default:
          return null
      }
    }

    const setup = async () => {
      const initialState = { settings: { foo: 0 } }
      const repo = await repoFromSnapshot(initialState)
      const reducer = getReducer(proxyReducer, repo)
      return { initialState, reducer }
    }

    it('should return a function', async () => {
      const { reducer } = await setup()
      expect(typeof reducer).toBe('function')
    })

    it('should not change the original state', async () => {
      const { initialState, reducer } = await setup()
      const _newState = reducer(initialState, { type: 'WHATEVER', payload: 2 })
      expect(initialState).toEqual({ settings: { foo: 0 } })
    })

    it('should return a modified state', async () => {
      const { initialState, reducer } = await setup()
      const newState = reducer(initialState, { type: 'WHATEVER', payload: 2 })
      expect(newState).toEqual({ settings: { foo: 2 } })
    })
  })

  describe('with collection', () => {
    const proxyReducer: ProxyReducer = ((_, { type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER':
          return {
            collection: 'teachers',
            id: payload.id,
            fn: (row) => Object.assign(row, payload),
          } as ChangeManifest<any>
      }
    }) as ProxyReducer

    const setup = async () => {
      const initialState = { teachers: {} }
      const repo = await repoFromSnapshot(initialState, ['teachers'])
      const reducer = getReducer(proxyReducer, repo)
      return { initialState, reducer }
    }

    it('should return a function', async () => {
      const { reducer } = await setup()
      expect(typeof reducer).toBe('function')
    })

    it('should not change the original state', async () => {
      const { initialState, reducer } = await setup()
      const _newState = reducer(initialState, { type: 'ADD_TEACHER', payload: { id: 1 } })
      expect(initialState).toEqual({ teachers: {} })
    })

    it('should return a modified state', async () => {
      const { initialState, reducer } = await setup()
      const newState = reducer(initialState, { type: 'ADD_TEACHER', payload: { id: 1 } })
      expect(newState).toEqual({ teachers: { 1: { id: 1 } } })
    })
  })
})
