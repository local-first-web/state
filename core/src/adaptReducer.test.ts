import * as automerge from 'automerge'
import { adaptReducer } from './adaptReducer'
import { automergify } from './automergify'
import { Connection } from './connection'
import { RECEIVE_MESSAGE_FROM_FEED } from './constants'
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
    const newState = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(newState).toEqual({ foo: 'pizza' }))
    it('should return a DocSet containing one automerge object', () => {
      expect(() => automerge.change(newState, s => (s!.foo = 'foozball'))).not.toThrow()
    })
  })

  describe('should apply automerge changes from the feed', () => {
    const reducer = adaptReducer(proxyReducer)

    const doc1 = automergify({} as FooState)
    const doc2 = automerge.change(doc1, s => (s.boo = 'foozball'))
    const changes = automerge.getChanges(doc1, doc2)

    const message = { clock: {}, changes }
    const connection = new Connection(doc1)
    const state2 = reducer(doc1, {
      type: RECEIVE_MESSAGE_FROM_FEED,
      payload: { message, connection },
    })

    it('should apply the changes and return the new state', () =>
      expect(state2!.boo).toEqual('foozball'))
  })
})
