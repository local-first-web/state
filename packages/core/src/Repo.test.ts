import A from 'automerge'
import { newid } from 'cevitxe-signal-client'
import { Repo } from './Repo'

describe('Repo', () => {
  const ID = '1'

  const setup = async () => {
    const beforeDoc = A.from({ birds: ['goldfinch'] })
    const afterDoc = A.change(beforeDoc, s => (s.birds = ['swallows']))
    const changes = A.getChanges(beforeDoc, afterDoc)
    const repo = new Repo({ discoveryKey: 'jive-panda', databaseName: `testdb-${newid()}` })
    await repo.open()
    await repo.set(ID, beforeDoc)
    const callback = jest.fn((_documentId, _doc) => {})
    repo.addHandler(callback)
    return { beforeDoc, afterDoc, changes, repo, callback }
  }

  describe('get', () => {
    it('should have a document inside the repo', async () => {
      const { beforeDoc, repo } = await setup()
      expect(await repo.get(ID)).toEqual(beforeDoc)
    })
  })

  describe('set', () => {})
  describe('change', () => {})
  describe('applyChanges', () => {})
  describe('getHistory', () => {})
  describe('loadHistory', () => {})
  describe('getSnapshot', () => {})
  describe('changeSnapshot', () => {})
  describe('setSnapshot', () => {})
  describe('removeSnapshot', () => {})
  describe('getState', () => {})
  describe('loadState', () => {})

  describe('addHandler', () => {
    it('should call the handler via set', async () => {
      const { afterDoc, repo, callback } = await setup()
      await repo.set(ID, afterDoc)
      expect(callback).toBeCalledTimes(1)
      expect(callback).toBeCalledWith(ID, afterDoc)
      expect(await repo.get(ID)).toEqual(afterDoc)
    })

    it('should call the handler via change', async () => {
      const { afterDoc, repo, callback } = await setup()
      await repo.change(ID, s => (s.birds = ['swallows']))
      expect(callback).toBeCalledTimes(1)
      expect(callback).toBeCalledWith(ID, afterDoc)
      expect(await repo.get(ID)).toEqual(afterDoc)
    })

    it('should call the handler via applyChanges', async () => {
      const { afterDoc, repo, callback, changes } = await setup()
      await repo.applyChanges(ID, changes)
      expect(callback).toBeCalledTimes(1)
      expect(callback).toBeCalledWith(ID, afterDoc)
      expect(await repo.get(ID)).toEqual(afterDoc)
    })
  })

  describe('removeHandler', () => {
    it('should allow removing the handler', async () => {
      const { repo, callback, changes } = await setup()
      repo.removeHandler(callback)
      repo.applyChanges(ID, changes)
      expect(callback).not.toBeCalled()
    })
  })
})
