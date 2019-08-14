import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'
import { docSetFromObject } from './docSetHelpers'

const proxyReducer: ProxyReducer = () => ({ settings: s => (s.foo = 2) })

describe('adaptReducer', () => {
  it('should be a function', () => {
    expect(typeof adaptReducer).toBe('function')
  })

  describe('should return a working reducer', () => {
    const state = { settings: {} }
    const docSet = docSetFromObject(state)
    const reducer = adaptReducer(proxyReducer, docSet)
    const newState = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(newState).toEqual({ settings: { foo: 2 } }))
  })
})
