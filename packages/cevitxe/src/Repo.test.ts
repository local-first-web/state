import A from 'automerge'
import { newid } from 'cevitxe-signal-client'
import { Repo } from './Repo'

describe('Repo', () => {
  const ID = '1'

  const setup = async () => {
    const doc1 = { birds: ['goldfinch'] }
    const doc2 = { birds: ['robin', 'swallow'] }
    const snapshot = { '123': doc1, '456': doc2 }
    const repo = new Repo({ discoveryKey: 'quiet-meerkat', databaseName: `testdb-${newid()}` })
    await repo.open()
    const create = true
    await repo.init(snapshot, create)
    return { doc1, doc2, repo }
  }

  describe('createFromSnapshot', () => {
    it('creates a repo from a snapshot', async () => {
      const { repo, doc1, doc2 } = await setup()
      const state = repo.getState()
      expect(state['123']).toEqual(doc1)
      expect(state['456']).toEqual(doc2)
    })
  })

  describe('count', () => {
    it('returns zero for an empty repo', async () => {
      const repo = new Repo({ discoveryKey: 'quiet-meerkat', databaseName: `testdb-${newid()}` })
      await repo.open()
      const create = true
      await repo.init({}, create)
      expect(repo.count).toEqual(0)
    })

    it('returns non-zero for a non-empty repo', async () => {
      const { repo } = await setup()
      expect(repo.count).not.toEqual(0)
    })
  })

  describe('set & get', () => {
    it('returns undefined for a nonexistent doc', async () => {
      const repo = new Repo({ discoveryKey: 'swell-pancake', databaseName: `testdb-${newid()}` })
      await repo.open()
      const doc = A.from({ birds: ['goldfinch'] })
      await repo.set(ID, doc)
      expect(await repo.get('123')).toEqual(undefined)
    })

    it("gets a document that's been set", async () => {
      const repo = new Repo({ discoveryKey: 'swell-pancake', databaseName: `testdb-${newid()}` })
      await repo.open()
      const doc = A.from({ birds: ['goldfinch'] })
      await repo.set(ID, doc)
      expect(await repo.get(ID)).toEqual(doc)
    })
  })

  describe('change', () => {
    it('modifies a document using a change function', async () => {
      const doc = A.from({ birds: ['goldfinch'] })
      const repo = new Repo({ discoveryKey: 'jive-panda', databaseName: `testdb-${newid()}` })
      await repo.open()
      await repo.set('123', doc)
      expect(await repo.get('123')).toEqual(doc)
      await repo.change('123', doc => doc.birds.push('swallow'))
      expect(await repo.get('123')).toEqual({ birds: ['goldfinch', 'swallow'] })
    })
  })

  describe('listeners', () => {
    const setup = async () => {
      const beforeDoc = A.from<any>({ birds: ['goldfinch'] })
      const afterDoc = A.change(beforeDoc, s => (s.birds = ['swallows']))
      const changes = A.getChanges(beforeDoc, afterDoc)
      const repo = new Repo({ discoveryKey: 'jive-panda', databaseName: `testdb-${newid()}` })
      await repo.open()
      await repo.set(ID, beforeDoc)
      const callback = jest.fn((_documentId, _doc) => {})
      repo.addListener(callback)
      return { beforeDoc, afterDoc, changes, repo, callback }
    }

    describe('addListener', () => {
      it('should call the listener via set', async () => {
        const { afterDoc, repo, callback } = await setup()
        await repo.set(ID, afterDoc)
        expect(callback).toBeCalledTimes(1)
        expect(callback).toBeCalledWith(ID, afterDoc)
        expect(await repo.get(ID)).toEqual(afterDoc)
      })

      it('should call the listener via change', async () => {
        const { afterDoc, repo, callback } = await setup()
        await repo.change(ID, s => (s.birds = ['swallows']))
        expect(callback).toBeCalledTimes(1)
        expect(callback).toBeCalledWith(ID, afterDoc)
        expect(await repo.get(ID)).toEqual(afterDoc)
      })

      it('should call the listener via applyChanges', async () => {
        const { afterDoc, repo, callback, changes } = await setup()
        await repo.applyChanges(ID, changes)
        expect(callback).toBeCalledTimes(1)
        expect(callback).toBeCalledWith(ID, afterDoc)
        expect(await repo.get(ID)).toEqual(afterDoc)
      })
    })

    describe('removeListener', () => {
      it('should allow removing the listener', async () => {
        const { repo, callback, changes } = await setup()
        repo.removeListener(callback)
        repo.applyChanges(ID, changes)
        expect(callback).not.toBeCalled()
      })
    })
  })
})
