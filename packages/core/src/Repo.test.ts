import A from 'automerge'
import { newid } from 'cevitxe-signal-client'
import { Repo, RepoEventHandler } from './Repo'

describe('Repo', () => {
  let beforeDoc: A.Doc<any>
  let afterDoc: A.Doc<any>
  let repo: Repo
  let changes: A.Change[]
  let callback: RepoEventHandler<any>
  const ID = '1'

  beforeEach(async () => {
    beforeDoc = A.from({ birds: ['goldfinch'] })
    afterDoc = A.change(beforeDoc, s => (s.birds = ['swallows']))
    changes = A.getChanges(beforeDoc, afterDoc)
    repo = new Repo('jive-panda', `testdb-${newid()}`)
    await repo.set(ID, beforeDoc)
    callback = jest.fn((documentId, doc) => {})
    repo.addHandler(callback)
  })

  it('should have a document inside the repo', async () => {
    expect(await repo.get(ID)).toEqual(beforeDoc)
  })

  it('should call the handler via set', async () => {
    await repo.set(ID, afterDoc)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(await repo.get(ID)).toEqual(afterDoc)
  })

  it('should call the handler via change', async () => {
    await repo.change(ID, s => (s.birds = ['swallows']))
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(await repo.get(ID)).toEqual(afterDoc)
  })

  it('should call the handler via applyChanges', async () => {
    await repo.applyChanges(ID, changes)
    expect(callback).toBeCalledTimes(1)
    expect(callback).toBeCalledWith(ID, afterDoc)
    expect(await repo.get(ID)).toEqual(afterDoc)
  })

  it('should allow removing the handler', () => {
    repo.removeHandler(callback)
    repo.applyChanges(ID, changes)
    expect(callback).not.toBeCalled()
  })
})
