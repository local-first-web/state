import { getReducer } from './getReducer'
import { repoFromSnapshot } from './repoTestHelpers'
import { ProxyReducer } from 'cevitxe-types'
import { pause as _yield } from './pause'
import { Reducer, AnyAction } from 'redux'
import { Repo } from './Repo'

describe('getReducer', () => {
  describe('should return a working reducer', () => {
    let proxyReducer: ProxyReducer
    let state: any
    let repo: Repo
    let reducer: Reducer<any, AnyAction>

    beforeEach(async () => {
      proxyReducer = () => ({ settings: s => (s.foo = 2) })
      state = { settings: {} }
      repo = await repoFromSnapshot(state)
      reducer = getReducer(proxyReducer, repo)
    })

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
