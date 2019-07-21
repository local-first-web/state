import A from 'automerge'
import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'

interface FooState {
  foo?: number
}

const proxyReducer: ProxyReducer<FooState> = () => state => (state.foo = 2)

describe('adaptReducer', () => {
  it('should be a function', () => {
    expect(typeof adaptReducer).toBe('function')
  })

  describe('should return a working reducer', () => {
    const reducer = adaptReducer(proxyReducer)
    const state = A.from({})
    const newState = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(newState).toEqual({ foo: 2 }))
  })
})
