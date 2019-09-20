import { adaptReducer } from './adaptReducer'
import { collection } from './collection'
import { docSetFromObject } from './docSetHelpers'
import { ProxyReducer } from './types'

describe('collections', () => {
  const teachers = collection('teachers')
  const students = collection('students')

  const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }

  const proxyReducer: ProxyReducer = ((state, { type, payload }) => {
    switch (type) {
      // teachers
      case 'ADD_TEACHER':
        return teachers.reducers.add(payload)
      case 'REMOVE_TEACHER':
        return teachers.reducers.remove(payload)
      case 'UPDATE_TEACHER':
        return teachers.reducers.update(payload)
      case 'CLEAR_TEACHERS':
        return teachers.reducers.drop()

      // students
      case 'ADD_STUDENT':
        return students.reducers.add(payload)
      case 'REMOVE_STUDENT':
        return students.reducers.remove(payload)
      case 'UPDATE_STUDENT':
        return students.reducers.update(payload)
      case 'CLEAR_STUDENTS':
        return students.reducers.drop()
      default:
        return null
    }
  }) as ProxyReducer

  describe('collection names and keyNames', () => {
    test('round trip', () => {
      // Collection names are prefixed to minimize the chance of collisions with other state
      // properties. We don't care how key names are generated from collection names, just that we
      // can go back and forth between the two
      const { getCollectionName, getKeyName } = collection
      const collectionName = 'widgets'
      const keyName = '::widgets'
      expect(getCollectionName(getKeyName(collectionName))).toEqual(collectionName)
      expect(getKeyName(getCollectionName(keyName))).toEqual(keyName)
    })
  })

  describe('reducers', () => {
    const setupEmpty = () => {
      let state = {}
      const docSet = docSetFromObject({})
      const reducer = adaptReducer(proxyReducer, docSet)
      return { state, reducer }
    }

    const setupWithOneTeacher = () => {
      let state = {}
      const docSet = docSetFromObject(state)
      const reducer = adaptReducer(proxyReducer, docSet)
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      state = reducer({}, action)
      return { state, reducer }
    }

    it('should not change the original state', () => {
      const { state, reducer } = setupEmpty()
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      const _ = reducer(state, action)
      expect(state).toEqual({})
    })

    it('should add an item', () => {
      const { state, reducer } = setupEmpty()
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      const newState = reducer(state, action)
      const allItems = teachers.selectors.getAll(newState)
      expect(allItems).toEqual([teacher1])
    })

    it('should update an item', () => {
      const { state, reducer } = setupWithOneTeacher()
      const action = { type: 'UPDATE_TEACHER', payload: { id: teacher1.id, first: 'Herbert' } }
      const newState = reducer(state, action)
      const allItems = teachers.selectors.getAll(newState)
      expect(allItems).toEqual([{ id: 'abcxyz', first: 'Herbert', last: 'Caudill' }])
    })

    it('should remove an item', () => {
      const { state, reducer } = setupWithOneTeacher()
      const action = { type: 'REMOVE_TEACHER', payload: { id: teacher1.id } }
      const newState = reducer(state, action)
      const allItems = teachers.selectors.getAll(newState)
      expect(allItems).toHaveLength(0)
    })

    // TODO: This test should be moved somewhere where it will work - this is taken care of by middleware
    // it('should allow dropping a collection', () => {
    //   const { state, reducer } = setupWithOneTeacher()
    //   const action = { type: 'CLEAR_TEACHERS' }
    //   const newState = reducer(state, action)
    //   const allItems = teachers.toArray(newState)
    //   expect(allItems).toHaveLength(0)
    // })

    it('should allow adding multiple items from an array', () => {
      const { state, reducer } = setupWithOneTeacher()
      const addAction = {
        type: 'ADD_STUDENT',
        payload: [
          { id: 'student_001' }, //
          { id: 'student_002' },
          { id: 'student_003' },
        ],
      }
      const newState = reducer(state, addAction)
      const allItems = students.selectors.getAll(newState)
      expect(allItems).toEqual([
        { id: 'student_001' },
        { id: 'student_002' },
        { id: 'student_003' },
      ])
    })
  })

  describe('selectors', () => {
    const setupTeachers = () => {
      let state = {}
      const docSet = docSetFromObject(state)
      const reducer = adaptReducer(proxyReducer, docSet)
      const addAction = {
        type: 'ADD_TEACHER',
        payload: [
          { id: 'teacher_001' }, //
          { id: 'teacher_002' },
          { id: 'teacher_003' },
        ],
      }
      state = reducer(state, addAction)
      return { state, reducer }
    }

    const setupTeachersAndStudents = () => {
      let state = {}
      const docSet = docSetFromObject(state)
      const reducer = adaptReducer(proxyReducer, docSet)
      state = reducer(state, {
        type: 'ADD_TEACHER',
        payload: [
          { id: 'teacher_001' }, //
          { id: 'teacher_002' },
          { id: 'teacher_003' },
        ],
      })
      state = reducer(state, {
        type: 'ADD_STUDENT',
        payload: [
          { id: 'student_001' }, //
          { id: 'student_002' },
        ],
      })
      return { state, reducer }
    }

    describe('getArray', () => {
      it('should return all the items in the collection', () => {
        const { state } = setupTeachers()
        const allItems = teachers.selectors.getAll(state)
        expect(allItems).toEqual([
          { id: 'teacher_001' },
          { id: 'teacher_002' },
          { id: 'teacher_003' },
        ])
      })

      it('should keep items from different collections separate', () => {
        let { state } = setupTeachersAndStudents()
        const allTeachers = teachers.selectors.getAll(state)
        expect(allTeachers).toEqual([
          { id: 'teacher_001' },
          { id: 'teacher_002' },
          { id: 'teacher_003' },
        ])
        const allStudents = students.selectors.getAll(state)
        expect(allStudents).toEqual([
          { id: 'student_001' }, //
          { id: 'student_002' },
        ])
      })

      it('should only return non-deleted items', () => {
        // populate with three items
        const { state, reducer } = setupTeachers()

        // remove one
        const action = { type: 'REMOVE_TEACHER', payload: { id: 'teacher_002' } }
        const newState = reducer(state, action)

        // check the new list of items
        const allItems = teachers.selectors.getAll(newState)
        expect(allItems).toEqual([
          { id: 'teacher_001' }, //
          { id: 'teacher_003' },
        ])
      })

      it('should return empty array if state is undefined', () => {
        const actual = teachers.selectors.getAll(undefined)
        expect(actual).toEqual([])
      })
    })

    describe('getMap', () => {
      it('should return all the items in the collection', () => {
        const { state } = setupTeachers()
        const allItems = teachers.selectors.getMap(state)
        expect(allItems).toEqual({
          teacher_001: { id: 'teacher_001' },
          teacher_002: { id: 'teacher_002' },
          teacher_003: { id: 'teacher_003' },
        })
      })
    })

    describe('count', () => {
      it('should return the number of items in the collection', () => {
        const { state } = setupTeachers()
        const count = teachers.selectors.count(state)
        expect(count).toEqual(3)
      })

      it('should only count non-deleted items', () => {
        // populate with three items
        const { state, reducer } = setupTeachers()
        const count = teachers.selectors.count(state)
        expect(count).toEqual(3)

        // remove one
        const action = { type: 'REMOVE_TEACHER', payload: { id: 'teacher_002' } }
        const newState = reducer(state, action)

        // check the new count
        const newCount = teachers.selectors.count(newState)
        expect(newCount).toEqual(2)
      })

      it('should return zero if state is undefined', () => {
        const count = teachers.selectors.count(undefined)
        expect(count).toEqual(0)
      })
    })
  })

  // describe('deleteCollectionItems', () => {
  //   const docSet = docSetFromObject({
  //     teachers: {
  //       1: true,
  //       2: true,
  //       3: true,
  //     },
  //     1: { id: '1', type: 'teacher' },
  //     2: { id: '2', type: 'teacher' },
  //     3: { id: '3', type: 'teacher' },

  //     schools: {
  //       4: true,
  //       5: true,
  //     },
  //     4: { id: '4', type: 'school' },
  //     5: { id: '4', type: 'school' },
  //   })

  //   it('should remove all items listed in index', () => {
  //     deleteCollectionItems(docSet, 'teachers')
  //     expect(docSetToObject(docSet)).toEqual({
  //       teachers: {
  //         1: false,
  //         2: false,
  //         3: false,
  //       },

  //       schools: {
  //         4: true,
  //         5: true,
  //       },
  //       4: { id: '4', type: 'school' },
  //       5: { id: '4', type: 'school' },
  //     })
  //   })
  // })

  // describe('purgeDeletedCollectionItems', () => {
  //   const docSet = docSetFromObject({
  //     teachers: {
  //       1: true,
  //       2: false,
  //       3: false,
  //     },
  //     1: { id: '1', type: 'teacher' },
  //     2: { id: '2', type: 'teacher' },
  //     3: { id: '3', type: 'teacher' },

  //     schools: {
  //       4: true,
  //       5: true,
  //     },
  //     4: { id: '4', type: 'school' },
  //     5: { id: '5', type: 'school' },
  //   })

  //   it('should remove all docs marked as deleted in the index', () => {
  //     purgeDeletedCollectionItems(docSet, 'teachers')
  //     expect(docSetToObject(docSet)).toEqual({
  //       teachers: {
  //         1: true,
  //         2: false,
  //         3: false,
  //       },
  //       1: { id: '1', type: 'teacher' },

  //       schools: {
  //         4: true,
  //         5: true,
  //       },
  //       4: { id: '4', type: 'school' },
  //       5: { id: '5', type: 'school' },
  //     })
  //   })
  // })
})
