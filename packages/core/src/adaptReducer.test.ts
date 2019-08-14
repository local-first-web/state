import A from 'automerge'
import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'
import { AnyAction } from 'redux'

interface FooState {
  foo?: number
}

const proxyReducer: ProxyReducer = () => ({ state: s => (s.foo = 2) })

describe('adaptReducer', () => {
  it('should be a function', () => {
    expect(typeof adaptReducer).toBe('function')
  })

  describe('should return a working reducer', () => {
    const docSet = new A.DocSet()
    const reducer = adaptReducer(proxyReducer, docSet)
    const state = A.from({})
    const newState = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(newState).toEqual({ foo: 2 }))
  })
})
