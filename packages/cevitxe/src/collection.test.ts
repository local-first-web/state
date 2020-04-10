import { Collection } from './Collection'

describe('collections', () => {
  describe('collection names and keyNames', () => {
    test('round trip', () => {
      // Collection names are prefixed to minimize the chance of collisions with other state
      // properties. We don't care how key names are generated from collection names, just that we
      // can go back and forth between the two
      const { getCollectionName, getKeyName } = Collection
      const collectionName = 'widgets'
      const keyName = getKeyName(collectionName)
      expect(getCollectionName(keyName)).toEqual(collectionName)
    })
  })

  describe('normalize, denormalize', () => {
    const { normalize, denormalize } = Collection

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
