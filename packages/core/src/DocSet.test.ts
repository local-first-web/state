import A from 'automerge'
import { DocSet, DocSetHandler } from './DocSet'

describe('DocSet', () => {
  let beforeDoc: A.Doc<any>
  let afterDoc: A.Doc<any>
  let docSet: DocSet
  let changes: A.Change[]
  let callback: DocSetHandler<any>
  const ID = '1'

  beforeEach(() => {
    beforeDoc = A.change(A.init(), doc => (doc.birds = ['goldfinch']))
    afterDoc = A.change(beforeDoc, doc => (doc.birds = ['swallows']))
    changes = A.getChanges(beforeDoc, afterDoc)
    docSet = new DocSet()
    docSet.setDoc(ID, beforeDoc)
    callback = jest.fn((documentId, doc) => {})
    docSet.registerHandler(callback)
  })

  it('should have a document inside the docset', () => {
    expect(docSet.getDoc(ID)).toEqual(beforeDoc)
  })

  it('should call the handler via set', () => {
    docSet.setDoc(ID, afterDoc)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(docSet.getDoc(ID)).toEqual(afterDoc)
  })

  it('should call the handler via applyChanges', () => {
    docSet.applyChanges(ID, changes)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(docSet.getDoc(ID)).toEqual(afterDoc)
  })

  it('should allow removing the handler', () => {
    docSet.unregisterHandler(callback)
    docSet.applyChanges(ID, changes)
    expect(callback).not.toBeCalled()
  })

  it('should allow removing a document', () => {
    docSet.removeDoc(ID)
    expect(docSet.getDoc(ID)).toBe(undefined)
  })
})
