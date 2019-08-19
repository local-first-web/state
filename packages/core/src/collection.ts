import A from 'automerge'
import { DocSet } from './lib/automerge'
import { DELETE_COLLECTION, DELETE_ITEM } from './constants'

const collKey = (key: string) => `__col_${key}`
const itmKey = (key: string, itemKey: string) => `${collKey(key)}_${itemKey}`

export const collection = (key: string) => ({
  add: () => ({ [collKey(key)]: (s: any) => Object.assign(s, {}) }),
  remove: () => {
    return { [collKey(key)]: DELETE_COLLECTION }
  },
  addItem: (item: any, keyField: string = 'id') => ({
    [collKey(key)]: (s: any) => Object.assign(s, { [itmKey(key, item[keyField])]: true }),
    [itmKey(key, item[keyField])]: (s: any) => Object.assign(s, item),
  }),
  updateItem: (item: any, keyField: string = 'id') => ({
    [itmKey(key, item[keyField])]: (s: any) => Object.assign(s, item),
  }),
  removeItem: (itemKey: string) => ({
    [collKey(key)]: (s: any) => delete s[itmKey(key, itemKey)],
    [itmKey(key, itemKey)]: DELETE_ITEM,
  }),
})

export const deleteCollectionItems = (docSet: DocSet<any>, key: string) => {
  const collectionIndexDoc = docSet.getDoc(key)
  for (const docId in collectionIndexDoc) {
    docSet.removeDoc(docId)
    delete collectionIndexDoc[docId]
  }
  docSet.setDoc(key, collectionIndexDoc)
}
