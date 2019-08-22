import { collection, deleteCollectionItems } from './collection'
import { docSetFromObject, docSetToObject } from './docSetHelpers'

describe('collection', () => {
  const teachers = 'teachers'

  it('should return an object with known keys', () => {
    const expectedKeys = [
      'keyName',
      'drop',
      'add',
      'addManyFromMap',
      'update',
      'remove',
      'getAll',
      'count',
    ]
    const actual = collection(teachers)
    expect(Object.keys(actual)).toEqual(expectedKeys)
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
