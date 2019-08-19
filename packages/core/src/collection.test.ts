import { collection, deleteCollectionItems } from './collection'
import { docSetFromObject, docSetToObject } from './docSetHelpers'

describe('collection', () => {
  const teachersKey = 'teachers'
  it('should return an object with functions', () => {
    const expectedKeys = ['add', 'remove', 'addItem', 'updateItem', 'removeItem']
    const actual = collection(teachersKey)
    expect(Object.keys(actual)).toEqual(expectedKeys)
  })

  //   it('add method should new collection command', () => {
  //     const actual = collection(teachersKey).add()
  // This feels stupid
  //     expect(actual).toBe({
  //       [`__col_${teachersKey}`]: (s: any) => Object.assign(s, {}),
  //     })
  //   })
})

describe('deleteCollectionItems', () => {
  const docSet = docSetFromObject({
    teachers: {
      abc: true,
      def: true,
    },
    abc: { id: 'abc' },
    def: { id: 'def' },
    schools: { xyz: true },
    xyz: { id: 'xyz', type: 'school' },
  })
  it('should remove all items listed in key doc', () => {
    deleteCollectionItems(docSet, 'teachers')
    expect(docSetToObject(docSet)).toEqual({
      schools: { xyz: true },
      teachers: {},
      xyz: { id: 'xyz', type: 'school' },
    })
  })
})
