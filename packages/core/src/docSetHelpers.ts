import A from 'automerge'

export const docSetToObject = (docSet: A.DocSet<any>): any => {
  const result = {} as any
  // get rid of next line when automerge v0.13 is published
  // @ts-ignore
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
