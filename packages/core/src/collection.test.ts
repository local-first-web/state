import { collection } from './collection'
import { DELETE_COLLECTION, DELETE_ITEM } from './constants'

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
