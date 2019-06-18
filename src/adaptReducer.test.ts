import automerge, { DocSet } from 'automerge'
import { adaptReducer } from './adaptReducer'
import { automergify } from './automergify'
import { DOC_ID } from './constants'
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
    const state = new DocSet<FooState>()
    const doc = automergify({})
    state.setDoc(DOC_ID, doc)
    const newState = reducer(state, { type: 'FOO' })
    const newDoc = newState.getDoc(DOC_ID)

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(doc).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(newDoc).toEqual({ foo: 'pizza' }))
    it('should return a DocSet containing one automerge object', () => {
      expect(() => automerge.change(newDoc, s => (s!.foo = 'foozball'))).not.toThrow()
    })
  })

  // describe('should apply automerge changes from the feed', () => {
  //   const reducer = adaptReducer(proxyReducer)

  //   const doc1 = automergify({} as FooState)
  //   const doc2 = automerge.change(doc1, s => (s.boo = 'foozball'))

  //   const [change] = automerge.getChanges(doc1, doc2)

  //   const state1 = new DocSet()
  //   state1.setDoc('DOC_ID', doc1)

  //   const state2 = reducer(state1, { type: APPLY_MESSAGE_FROM_FEED, payload: { message, connection } })
  //   const newDoc = state2.getDoc(DOC_ID)

  //   it('should apply the changes and return the new state', () => expect(newDoc!.boo).toEqual('foozball'))

  //   // TODO: test the INITIALIZE path in adaptReducer
  // })
})
