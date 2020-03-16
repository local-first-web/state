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
    await repo.createFromSnapshot(snapshot)
    return { doc1, doc2, repo }
  }

  describe('init', () => {})

  describe('createFromSnapshot', () => {
    it('creates a repo from a snapshot', async () => {
      const { repo, doc1, doc2 } = await setup()
      expect(await repo.get('123')).toEqual(doc1)
      expect(await repo.get('456')).toEqual(doc2)
    })
  })

  describe('documentIds', () => {
    it('returns the correct list of documentIds', async () => {
      const { repo } = await setup()
      expect(repo.documentIds).toEqual(['123', '456'])
    })
  })

  describe('has', () => {
    it('returns true when a document is present', async () => {
      const { repo } = await setup()
      expect(repo.has('123')).toBe(true)
    })

    it('returns false when a document is not present', async () => {
      const { repo } = await setup()
      expect(repo.has('xyz')).toBe(false)
    })
  })

  describe('count', () => {
    it('returns zero for an empty repo', async () => {
      const repo = new Repo({ discoveryKey: 'quiet-meerkat', databaseName: `testdb-${newid()}` })
      await repo.open()
      expect(repo.count).toEqual(0)
    })

    it('returns the correct number of documents in the repo', async () => {
      const { repo } = await setup()
      expect(repo.count).toEqual(2)
    })
  })

  describe('set & get', () => {
    const setup = async () => {
      const doc = A.from({ birds: ['goldfinch'] })
      const repo = new Repo({ discoveryKey: 'swell-pancake', databaseName: `testdb-${newid()}` })
      await repo.open()
      await repo.set(ID, doc)
      return { doc, repo }
    }

    it('returns undefined for a nonexistent doc', async () => {
      const { repo } = await setup()
      expect(await repo.get('123')).toEqual(undefined)
    })

    it("gets a document that's been set", async () => {
      const { doc, repo } = await setup()
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

  describe('applyChanges', () => {})
  describe('getHistory', () => {})
  describe('loadHistory', () => {})
  describe('getSnapshot', () => {})
  describe('changeSnapshot', () => {})
  describe('setSnapshot', () => {})
  describe('removeSnapshot', () => {})
  describe('getState', () => {})
  describe('loadState', () => {})

  describe('handlers', () => {
    const setup = async () => {
      const beforeDoc = A.from<any>({ birds: ['goldfinch'] })
      const afterDoc = A.change(beforeDoc, s => (s.birds = ['swallows']))
      const changes = A.getChanges(beforeDoc, afterDoc)
      const repo = new Repo({ discoveryKey: 'jive-panda', databaseName: `testdb-${newid()}` })
      await repo.open()
      await repo.set(ID, beforeDoc)
      const callback = jest.fn((_documentId, _doc) => {})
      repo.addHandler(callback)
      return { beforeDoc, afterDoc, changes, repo, callback }
    }

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
})
