import { adaptReducer } from './adaptReducer'
import { ProxyReducer } from 'types'
import { collection, deleteCollectionItems, purgeDeletedCollectionItems } from './collection'
import { docSetFromObject, docSetToObject } from './docSetHelpers'

describe('reducers', () => {
  const proxyReducer: ProxyReducer = (({ type, payload }) => {
    const teachers = collection('teachers').reducers
    const students = collection('students').reducers
    switch (type) {
      case 'ADD_TEACHER':
        return teachers.add(payload)
      case 'REMOVE_TEACHER':
        return teachers.remove(payload)
      case 'UPDATE_TEACHER':
        return teachers.update(payload)
      case 'CLEAR_TEACHERS':
        return teachers.drop()
      case 'ADD_STUDENTS':
        return students.addManyFromMap(payload.collection)
      default:
        return null
    }
  }) as ProxyReducer

  const teachersCollection = collection('teachers').keyName
  const studentsCollection = collection('students').keyName
  const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }

  const emptyState = {}
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
    expect(newState).toEqual({
      [teachersCollection]: { [teacher1.id]: false },
    })
  })

  it('should allow dropping a collection', () => {
    const { state, reducer } = setup(stateWithTeacher1)
    const action = { type: 'CLEAR_TEACHERS' }
    const newState = reducer(state, action)
    expect(newState).toEqual({
      [teachersCollection]: { [teacher1.id]: false },
    })
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
    })
  })
})

describe('selectors', () => {
  const name = 'teachers'
  const teachersCollection = collection(name)

  const reduxState = {
    [teachersCollection.keyName]: {
      1: true,
      2: false,
      3: true,
    },
    1: { id: '1', type: 'teacher' },
    2: { id: '2', type: 'teacher' },
    3: { id: '3', type: 'teacher' },
  }

  describe('getAll', () => {
    it('should only return non-deleted items for the collection', () => {
      const actual = teachersCollection.getAll(reduxState)
      expect(actual).toEqual([reduxState[1], reduxState[3]])
    })

    it('should return empty array if state is undefined', () => {
      const actual = teachersCollection.getAll(undefined)
      expect(actual).toEqual([])
    })

    it('should return empty array if collection index does not exist', () => {
      const state = { ...reduxState }
      delete state[teachersCollection.keyName]
      const actual = teachersCollection.getAll(state)
      expect(actual).toEqual([])
    })
  })

  describe('count', () => {
    it('should return the number of non-deleted items for the collection', () => {
      const actual = teachersCollection.count(reduxState)
      expect(actual).toEqual(2)
    })

    it('should return zero if state is undefined', () => {
      const actual = teachersCollection.count(undefined)
      expect(actual).toEqual(0)
    })

    it('should return zero if collection index does not exist', () => {
      const state = { ...reduxState }
      delete state[teachersCollection.keyName]
      const actual = teachersCollection.count(state)
      expect(actual).toEqual(0)
    })
  })
})

describe('deleteCollectionItems', () => {
  const docSet = docSetFromObject({
    teachers: {
      1: true,
      2: true,
      3: true,
    },
    1: { id: '1', type: 'teacher' },
    2: { id: '2', type: 'teacher' },
    3: { id: '3', type: 'teacher' },

    schools: {
      4: true,
      5: true,
    },
    4: { id: '4', type: 'school' },
    5: { id: '4', type: 'school' },
  })

  it('should remove all items listed in index', () => {
    deleteCollectionItems(docSet, 'teachers')
    expect(docSetToObject(docSet)).toEqual({
      teachers: {
        1: false,
        2: false,
        3: false,
      },

      schools: {
        4: true,
        5: true,
      },
      4: { id: '4', type: 'school' },
      5: { id: '4', type: 'school' },
    })
  })
})

describe('purgeDeletedCollectionItems', () => {
  const docSet = docSetFromObject({
    teachers: {
      1: true,
      2: false,
      3: false,
    },
    1: { id: '1', type: 'teacher' },
    2: { id: '2', type: 'teacher' },
    3: { id: '3', type: 'teacher' },

    schools: {
      4: true,
      5: true,
    },
    4: { id: '4', type: 'school' },
    5: { id: '5', type: 'school' },
  })

  it('should remove all docs marked as deleted in the index', () => {
    purgeDeletedCollectionItems(docSet, 'teachers')
    expect(docSetToObject(docSet)).toEqual({
      teachers: {
        1: true,
        2: false,
        3: false,
      },
      1: { id: '1', type: 'teacher' },

      schools: {
        4: true,
        5: true,
      },
      4: { id: '4', type: 'school' },
      5: { id: '5', type: 'school' },
    })
  })
})
