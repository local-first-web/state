import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from './types'
import { docSetFromObject } from './docSetHelpers'
import { DELETE } from './constants'

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

  describe('should handle multiple documents', () => {
    interface SchoolData {
      teachers: {}
      [k: string]: any
    }
    const proxyReducer: ProxyReducer = (({ type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER': {
          return {
            teachers: s => (s[payload.id] = true),
            [payload.id]: s => (s = Object.assign(s, payload)),
          }
        }
        case 'REMOVE_TEACHER': {
          return {
            teachers: s => delete s[payload.id],
            [payload.id]: DELETE,
          }
        }
        case 'UPDATE_TEACHER': {
          return {
            [payload.id]: s => (s = Object.assign(s, payload)),
          }
        }
        default:
          return null
      }
    }) as ProxyReducer

    const state = { teachers: {} }
    const docSet = docSetFromObject(state)
    const reducer = adaptReducer(proxyReducer, docSet)

    const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }
    const action = { type: 'ADD_TEACHER', payload: teacher1 }
    const state1 = reducer(state, action)
    it('should not change the original state', () => {
      expect(state).toEqual({ teachers: {} })
    })
    it('should add an item', () => {
      expect(state1).toEqual({
        abcxyz: { id: 'abcxyz', first: 'Herb', last: 'Caudill' },
        teachers: { abcxyz: true },
      })
    })
    it('should update an item', () => {
      const action = { type: 'UPDATE_TEACHER', payload: { ...teacher1, first: 'Herbert' } }
      const newState = reducer(state, action)
      expect(newState).toEqual({
        abcxyz: { id: 'abcxyz', first: 'Herbert', last: 'Caudill' },
        teachers: { abcxyz: true },
      })
    })
    it('should remove an item', () => {
      const action = { type: 'REMOVE_TEACHER', payload: teacher1 }
      const newState = reducer(state, action)
      expect(newState).toEqual({
        teachers: {},
      })
    })
  })
})
