import A from 'automerge'
import { DocSet } from './lib/automerge'

export const docSetToObject = (docSet: DocSet<any>): any => {
  const result = {} as any
  // get rid of next line when automerge v0.13 is published
  // @ts-ignore
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
