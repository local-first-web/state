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

  describe('should handle collections', () => {
    const proxyReducer: ProxyReducer = (({ type, payload }) => {
      switch (type) {
        case 'ADD_TEACHER': {
          return collection('teachers').add(payload)
        }
        case 'REMOVE_TEACHER': {
          return collection('teachers').remove(payload)
        }
        case 'UPDATE_TEACHER': {
          return collection('teachers').update(payload)
        }
        case 'CLEAR_TEACHERS': {
          return collection('teachers').drop()
        }
        case 'ADD_STUDENTS': {
          return collection('students').addManyFromMap(payload.collection)
        }
        default:
          return null
      }
    }) as ProxyReducer

    const teachersCollection = collection('teachers').keyName
    const studentsCollection = collection('students').keyName
    const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }

    const emptyState = { [teachersCollection]: {} }
    const stateWithTeacher1 = {
      [teacher1.id]: teacher1,
      [teachersCollection]: { [teacher1.id]: true },
    }

    const setup = (state = emptyState) => {
      const docSet = docSetFromObject(state)
      const reducer = adaptReducer(proxyReducer, docSet)
      return { state, reducer }
    }

    it('should not change the original state', () => {
      const { state, reducer } = setup()
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      const _newState = reducer(state, action) // don't need return value
      expect(state).toEqual(emptyState)
    })

    it('should add an item', () => {
      const { state, reducer } = setup()
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      const newState = reducer(state, action)
      expect(newState).toEqual(stateWithTeacher1)
    })

    it('should update an item', () => {
      const { state, reducer } = setup(stateWithTeacher1)
      const action = { type: 'UPDATE_TEACHER', payload: { id: teacher1.id, first: 'Herbert' } }
      const newState = reducer(state, action)
      expect(newState).toEqual({
        [teacher1.id]: { id: 'abcxyz', first: 'Herbert', last: 'Caudill' },
        [teachersCollection]: { [teacher1.id]: true },
      })
    })

    it('should remove an item', () => {
      const { state, reducer } = setup(stateWithTeacher1)
      const action = { type: 'REMOVE_TEACHER', payload: { id: teacher1.id } }
      const newState = reducer(state, action)
      expect(newState).toEqual(emptyState)
    })

    it('should allow dropping a collection', () => {
      const { state, reducer } = setup()
      const removeAction = { type: 'CLEAR_TEACHERS' }
      const removedState = reducer(state, removeAction)
      expect(removedState).toEqual({ [teachersCollection]: {} })
    })

    it('should allow adding multiple items to a new collection', () => {
      const { state, reducer } = setup()
      const students = {
        student_001: { id: 'student_001' },
        student_002: { id: 'student_002' },
        student_003: { id: 'student_003' },
      }
      const addAction = { type: 'ADD_STUDENTS', payload: { collection: students } }
      const addedState = reducer(state, addAction)
      expect(addedState).toEqual({
        ...students,
        [studentsCollection]: {
          student_001: true,
          student_002: true,
          student_003: true,
        },
        [teachersCollection]: {},
      })
    })
  })
})
