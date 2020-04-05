import { getReducer } from './getReducer'
import { collection } from './collection'
import { repoFromSnapshot } from './repoTestHelpers'
import { ProxyReducer } from 'cevitxe-types'
import { pause } from './pause'
import { AnyAction } from 'redux'
import { Repo } from './Repo'

describe('collections', () => {
  const teachers = collection('teachers')

  const teacher1 = { id: 'abcxyz', first: 'Herb', last: 'Caudill' }

  const proxyReducer: ProxyReducer = ((state, { type, payload }) => {
    switch (type) {
      case 'ADD_TEACHER':
        return teachers.reducers.add(payload)
      case 'REMOVE_TEACHER':
        return teachers.reducers.remove(payload)
      case 'UPDATE_TEACHER':
        return teachers.reducers.update(payload)
      case 'CLEAR_TEACHERS':
        return teachers.reducers.drop()
    }
  }) as ProxyReducer

  describe('collection names and keyNames', () => {
    test('round trip', () => {
      // Collection names are prefixed to minimize the chance of collisions with other state
      // properties. We don't care how key names are generated from collection names, just that we
      // can go back and forth between the two
      const { getCollectionName, getKeyName } = collection
      const collectionName = 'widgets'
      const keyName = getKeyName(collectionName)
      expect(getCollectionName(keyName)).toEqual(collectionName)
    })
  })

  const asyncReducer = (proxyReducer: ProxyReducer, repo: Repo) => {
    return async (state: any, { type, payload }: AnyAction) => {
      const _reducer = getReducer(proxyReducer, repo)
      const result = _reducer(state, { type, payload })
      await pause()
      return result
    }
  }

  describe('reducers', () => {
    const setupEmpty = async () => {
      let state = {}
      const repo = await repoFromSnapshot(state, ['teachers'])
      const reducer = asyncReducer(proxyReducer, repo)
      return { state, reducer }
    }

    const setupWithOneTeacher = async () => {
      let state = {}
      const repo = await repoFromSnapshot(state, ['teachers'])
      const reducer = asyncReducer(proxyReducer, repo)
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      state = await reducer({}, action)
      return { state, reducer }
    }

    it('should not change the original state', async () => {
      const { state, reducer } = await setupEmpty()
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      const newState = await reducer(state, action) // don't care for this test what newState is
      expect(state).toEqual({}) // original state object wasn't mutated
    })

    it('should add an item', async () => {
      const { state, reducer } = await setupEmpty()
      const action = { type: 'ADD_TEACHER', payload: teacher1 }
      const newState = await reducer(state, action)
      expect(newState.teachers).toEqual({
        abcxyz: { id: 'abcxyz', first: 'Herb', last: 'Caudill' },
      })
    })

    it('should add multiple items from an array', async () => {
      const { state, reducer } = await setupEmpty()
      const addAction = {
        type: 'ADD_TEACHER',
        payload: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      }
      const newState = await reducer(state, addAction)
      expect(newState.teachers).toEqual({
        a: { id: 'a' },
        b: { id: 'b' },
        c: { id: 'c' },
      })
    })

    it('should update an item', async () => {
      const { state, reducer } = await setupWithOneTeacher()
      const action = { type: 'UPDATE_TEACHER', payload: { id: teacher1.id, first: 'Herbert' } }
      const newState = await reducer(state, action)
      expect(newState.teachers).toEqual({
        abcxyz: { id: 'abcxyz', first: 'Herbert', last: 'Caudill' },
      })
    })

    it('should remove an item', async () => {
      const { state, reducer } = await setupWithOneTeacher()
      const action = { type: 'REMOVE_TEACHER', payload: { id: teacher1.id } }
      const newState = await reducer(state, action)
      expect(newState.teachers).toEqual({
        // empty
      })
    })

    it('should allow deleting an entire collection', async () => {
      const { state, reducer } = await setupEmpty()
      const addAction = {
        type: 'ADD_TEACHER',
        payload: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      }
      const state1 = await reducer(state, addAction)
      expect(state1.teachers).toEqual({
        a: { id: 'a' },
        b: { id: 'b' },
        c: { id: 'c' },
      })
      const dropAction = { type: 'CLEAR_TEACHERS' }
      const state2 = await reducer(state1, dropAction)
      expect(state2.teachers).toEqual({
        // empty
      })
    })
  })

  describe('normalize, denormalize', () => {
    const { normalize, denormalize } = collection

    test('todos', () => {
      const state = {
        visibilityFilter: 'all',
        todos: {
          abc123: {},
          qrs666: {},
        },
      }

      const normalizedState = {
        __global: {
          visibilityFilter: 'all',
        },
        __todos__abc123: {},
        __todos__qrs666: {},
      }

      const collections = ['todos']
      expect(normalize(state, collections)).toEqual(normalizedState)
      expect(denormalize(normalizedState, collections)).toEqual(state)
    })

    test('grid', () => {
      const state = {
        schema: {
          properties: {
            col_1: { description: 'Field 1' },
            col_2: { description: 'Field 2' },
            col_3: { description: 'Field 3' },
          },
        },
        rows: {
          row_1: { id: 'row_1' },
          row_2: { id: 'row_2' },
          row_3: { id: 'row_3' },
        },
      }

      const normalizedState = {
        __global: {
          schema: {
            properties: {
              col_1: { description: 'Field 1' },
              col_2: { description: 'Field 2' },
              col_3: { description: 'Field 3' },
            },
          },
        },
        __rows__row_1: { id: 'row_1' },
        __rows__row_2: { id: 'row_2' },
        __rows__row_3: { id: 'row_3' },
      }

      const collections = ['rows']
      expect(normalize(state, collections)).toEqual(normalizedState)
      expect(denormalize(normalizedState, collections)).toEqual(state)
    })

    test('school', () => {
      const state = {
        settings: {
          theme: 'light',
        },
        teachers: {
          abc123: {},
          qrs666: {},
        },
        students: {
          def987: {},
          xyz007: {},
        },
      }

      const normalizedState = {
        __global: {
          settings: {
            theme: 'light',
          },
        },
        __teachers__abc123: {},
        __teachers__qrs666: {},
        __students__def987: {},
        __students__xyz007: {},
      }

      const collections = ['teachers', 'students']
      expect(normalize(state, collections)).toEqual(normalizedState)
      expect(denormalize(normalizedState, collections)).toEqual(state)
    })
  })
})
