import A from './lib/automerge'
import { DocSetState } from 'types'

export const docSetToObject = <T = any>(docSet: A.DocSet<T>): DocSetState<T> => {
  const result = {} as any
  for (let docId of docSet.docIds) {
    result[docId] = docSet.getDoc(docId)
  }
  return result
}

export const docSetFromObject = (obj: any): A.DocSet<any> => {
  const docSet = new A.DocSet<any>()
  for (let docId of Object.getOwnPropertyNames(obj)) {
    docSet.setDoc(docId, A.from(obj[docId]))
  }
  return docSet
}
