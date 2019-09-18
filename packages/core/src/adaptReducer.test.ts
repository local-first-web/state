import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'
import { docSetFromObject } from './docSetHelpers'
import { collection } from './collection'

describe('adaptReducer', () => {
  describe('should return a working reducer', () => {
    const proxyReducer: ProxyReducer = () => ({ settings: s => (s.foo = 2) })
    const state = { settings: {} }
    const docSet = docSetFromObject(state)
    const reducer = adaptReducer(proxyReducer, docSet)

    it('should return a function', () => expect(typeof reducer).toBe('function'))

    const newState = reducer(state, { type: 'FOO' })
    it('should not change the original state', () => expect(state).toEqual({ settings: {} }))
    it('should return a modified state', () => expect(newState).toEqual({ settings: { foo: 2 } }))
  })
})
