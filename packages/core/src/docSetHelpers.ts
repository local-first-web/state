import A from 'automerge'
import { DocSetState } from 'types'
import { DocSet } from './DocSet'

export const docSetToObject = <T = any>(docSet: DocSet<T>): DocSetState<T> => {
  const result = {} as any
  for (let documentId of docSet.documentIds) {
    result[documentId] = docSet.getDoc(documentId)
  }
  return result
}

export const docSetFromObject = (obj: any): DocSet<any> => {
  const docSet = new DocSet<any>()
  for (let documentId of Object.getOwnPropertyNames(obj)) {
    docSet.setDoc(documentId, A.from(obj[documentId]))
  }
  return docSet
}
