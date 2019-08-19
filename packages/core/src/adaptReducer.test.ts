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

  describe('should handle multiple documents', () => {
    interface SchoolData {
      teachers: {}
      [k: string]: any
    }
    const proxyReducer: ProxyReducer = (({ type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER': {
          return collection('teachers').addItem(payload)
        }
        case 'REMOVE_TEACHER': {
          return collection('teachers').removeItem(payload.id)
        }
        case 'UPDATE_TEACHER': {
          return collection('teachers').updateItem(payload)
        }
        case 'CREATE_COLLECTION': {
          return collection(payload.id).add()
        }
        case 'REMOVE_COLLECTION': {
          return collection(payload.id).remove()
        }
        default:
          return null
      }
    }) as ProxyReducer

    const teachersCollKey = '__col_teachers'
    const state = { [teachersCollKey]: {} }
    const docSet = docSetFromObject(state)
    const reducer = adaptReducer(proxyReducer, docSet)

    const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }
    const teacher1Key = `${teachersCollKey}_${teacher1.id}`
    const action = { type: 'ADD_TEACHER', payload: teacher1 }
    const state1 = reducer(state, action)
    it('should not change the original state', () => {
      expect(state).toEqual({ [teachersCollKey]: {} })
    })
    it('should add an item', () => {
      expect(state1).toEqual({
        [teacher1Key]: { id: 'abcxyz', first: 'Herb', last: 'Caudill' },
        [teachersCollKey]: { [teacher1Key]: true },
      })
    })
    it('should update an item', () => {
      const action = { type: 'UPDATE_TEACHER', payload: { ...teacher1, first: 'Herbert' } }
      const newState = reducer(state, action)
      expect(newState).toEqual({
        [teacher1Key]: { id: 'abcxyz', first: 'Herbert', last: 'Caudill' },
        [teachersCollKey]: { [teacher1Key]: true },
      })
    })
    it('should remove an item', () => {
      const action = { type: 'REMOVE_TEACHER', payload: teacher1 }
      const newState = reducer(state, action)
      expect(newState).toEqual({
        [teachersCollKey]: {},
      })
    })

    it('should allow adding and removing collections', () => {
      const newCollectionKey = 'students'
      const addAction = { type: 'CREATE_COLLECTION', payload: { id: newCollectionKey } }
      const addedState = reducer(state, addAction)
      expect(addedState).toEqual({
        __col_students: {},
        [teachersCollKey]: {},
      })
      const removeAction = { type: 'REMOVE_COLLECTION', payload: { id: newCollectionKey } }
      const removedState = reducer(addedState, removeAction)
      expect(removedState).toEqual({
        [teachersCollKey]: {},
      })
    })
  })
})
