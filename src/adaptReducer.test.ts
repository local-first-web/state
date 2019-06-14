import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'
import { automergify } from './automergify'
import automerge from 'automerge'

const A: ProxyReducer<any> = () => state => (state.foo = 'pizza')

describe('adaptReducer', () => {
  it('should be a function', () => {
    expect(typeof adaptReducer).toBe('function')
  })

  describe('should return a working reducer', () => {
    const reducer = adaptReducer(A)
    const state = automergify({})
    const result = reducer(state, { type: 'FOO' })

    it('should return a function', () => expect(typeof reducer).toBe('function'))
    it('should not change the original state', () => expect(state).not.toHaveProperty('foo'))
    it('should return a modified state', () => expect(result).toEqual({ foo: 'pizza' }))
    it('should return an automerge object', () => {
      expect(() => automerge.change(result, s => (s.foo = 'foozball'))).not.toThrow()
    })
  })
})
