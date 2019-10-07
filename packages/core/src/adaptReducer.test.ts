import { adaptReducer } from './adaptReducer'
import { repoFromObject } from './repoHelpers'
import { ProxyReducer } from './types'
import { pause } from './lib/pause'

describe('adaptReducer', () => {
  describe('should return a working reducer', () => {
    const proxyReducer: ProxyReducer = () => ({ settings: s => (s.foo = 2) })
    const state = { settings: {} }
    const repo = repoFromObject(state)
    const reducer = adaptReducer(proxyReducer, repo)

    it('should return a function', () => expect(typeof reducer).toBe('function'))

    it('should not change the original state', async () => {
      const newState = reducer(state, { type: 'DOESNTMATTER' })
      expect(state).toEqual({ settings: {} })
    })

    it('should return a modified state', async () => {
      const newState = reducer(state, { type: 'DOESNTMATTER' })
      expect(newState).toEqual({ settings: { foo: 2 } })
    })
  })
})
