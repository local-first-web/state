import * as automerge from 'automerge'
import { adaptReducer } from './adaptReducer'
import { automergify } from './automergify'
import { Connection } from './connection'
import { RECEIVE_MESSAGE_FROM_FEED, DOC_ID } from './constants'
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
    const state = automergify({})
    const newState = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(newState).toEqual({ foo: 2 }))
  })

  // describe('should apply automerge changes from the feed', () => {
  //   const reducer = adaptReducer(proxyReducer)

  //   const state1 = automergify({} as FooState)
  //   const docSet = new automerge.DocSet<FooState>()
  //   docSet.setDoc(DOC_ID, state1)

  //   const changes = automerge.getChanges(state1, automerge.change(state1, s => (s.foo = 2)))

  //   const message = { clock: {}, changes }
  //   const connection = new Connection(docSet, )
  //   const action = {
  //     type: RECEIVE_MESSAGE_FROM_FEED,
  //     payload: { message, connection },
  //   }
  //   const state2 = reducer(state1, action)

  //   it('should apply the changes and return the new state', () => expect(state2.foo).toEqual(2))
  // })
})
