import automerge from 'automerge'
import { automergify } from './automergify'
import { APPLY_CHANGE_FROM_FEED } from './constants'
import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'

interface FooState {
  foo?: string
  boo?: string
}

const proxyReducer: ProxyReducer<FooState> = () => state => (state.foo = 'pizza')

describe('adaptReducer', () => {
  it('should be a function', () => {
    expect(typeof adaptReducer).toBe('function')
  })

  describe('should return a working reducer', () => {
    const reducer = adaptReducer(proxyReducer)
    const state = automergify({})
    const result = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(result).toEqual({ foo: 'pizza' }))
    it('should return an automerge object', () => {
      expect(() => automerge.change(result, s => (s!.foo = 'foozball'))).not.toThrow()
    })
  })

  describe('should apply automerge changes from the feed', () => {
    const reducer = adaptReducer(proxyReducer)

    const state1 = automergify({} as FooState)
    const state2 = automerge.change(state1, s => (s.boo = 'foozball'))

    const [change] = automerge.getChanges(state1, state2)
    const result = reducer(state1, { type: APPLY_CHANGE_FROM_FEED, payload: { change } })

    it('should apply the changes and return the new state', () => expect(result!.boo).toEqual('foozball'))

    // TODO: test the INITIALIZE path in adaptReducer
  })
})
