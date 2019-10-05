import A from 'automerge'
import { Repo, RepoEventHandler } from './Repo'

describe('Repo', () => {
  let beforeDoc: A.Doc<any>
  let afterDoc: A.Doc<any>
  let repo: Repo
  let changes: A.Change[]
  let callback: RepoEventHandler<any>
  const ID = '1'

  beforeEach(() => {
    beforeDoc = A.change(A.init(), doc => (doc.birds = ['goldfinch']))
    afterDoc = A.change(beforeDoc, doc => (doc.birds = ['swallows']))
    changes = A.getChanges(beforeDoc, afterDoc)
    repo = new Repo('test', 'test')
    repo.setDoc(ID, beforeDoc)
    callback = jest.fn((documentId, doc) => {})
    repo.registerHandler(callback)
  })

  it('should have a document inside the repo', () => {
    expect(repo.getDoc(ID)).toEqual(beforeDoc)
  })

  it('should call the handler via set', () => {
    repo.setDoc(ID, afterDoc)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(repo.getDoc(ID)).toEqual(afterDoc)
  })

  it('should call the handler via applyChanges', () => {
    repo.applyChanges(ID, changes)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(repo.getDoc(ID)).toEqual(afterDoc)
  })

  it('should allow removing the handler', () => {
    repo.unregisterHandler(callback)
    repo.applyChanges(ID, changes)
    expect(callback).not.toBeCalled()
  })

  it('should allow removing a document', () => {
    repo.removeDoc(ID)
    expect(repo.getDoc(ID)).toBe(undefined)
  })
})
