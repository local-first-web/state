import A from 'automerge'
import { DocSet } from './lib/automerge'
import { DocSetState } from 'types'

export const docSetToObject = <T = any>(docSet: DocSet<T>): DocSetState<T> => {
  const result = {} as any
  for (let docId of docSet.docIds) {
    result[docId] = docSet.getDoc(docId)
  }
  return result
}

export const docSetFromObject = (obj: any): DocSet<any> => {
  const docSet = new DocSet<any>()
  for (let docId of Object.getOwnPropertyNames(obj)) {
    docSet.setDoc(docId, A.from(obj[docId]))
  }
  return docSet
}
