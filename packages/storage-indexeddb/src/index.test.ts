import { IdbAdapter } from '.'
import { newid } from '@localfirst/relay-client'

const setup = async () => {
  const storage = new IdbAdapter({ discoveryKey: 'silly-coder', databaseName: `test-${newid()}` })
  return { storage }
}

describe('IdbAdapter', () => {
  describe('open & close', () => {
    test(`doesn't crash`, async () => {
      const { storage } = await setup()
      await storage.open()
      await storage.close()
      // yay nothing blew up
    })
  })

  describe('snapshots', () => {
    test('`snapshots`', async () => {
      const { storage } = await setup()
      await storage.open()
      const documentId = '123'
      const snapshot = { foo: 42 }
      const clock = { local: 1 }
      // add a snapshot
      await storage.putSnapshot({ documentId, snapshot, clock })
      // should be the only one there
      for await (const snapshotRecord of storage.snapshots())
        expect(snapshotRecord).toEqual({ documentId, snapshot, clock })
    })

    test('deleteSnapshot', async () => {
      const { storage } = await setup()
      await storage.open()
      const documentId = '123'
      const snapshot = { foo: 42 }
      const clock = { local: 1 }
      // add a snapshot
      await storage.putSnapshot({ documentId, snapshot, clock })
      // delete it
      await storage.deleteSnapshot(documentId)
      // confirm that no snapshots are left
      let count = 0
      for await (const _ of storage.snapshots()) count++
      expect(count).toBe(0)
    })
  })

  describe('changes', () => {
    test('`changes` getter', async () => {
      const { storage } = await setup()
      await storage.open()
      const changeSet = { documentId: '123', changes: [] }
      // add a changeset
      await storage.appendChanges(changeSet)
      // should be the only one there
      for await (const c of storage.changes()) expect(c).toEqual(expect.objectContaining(changeSet))
    })

    test('getChanges', async () => {
      const { storage } = await setup()
      await storage.open()
      const changeSet = { documentId: '123', changes: [] }
      // add a changeset
      await storage.appendChanges(changeSet)
      // retrieve it & confirm it looks right
      expect(await storage.getChanges('123')).toEqual([expect.objectContaining(changeSet)])
    })
  })

  describe('hasData', () => {
    test('returns false on a newly created adapter', async () => {
      const { storage } = await setup()
      await storage.open()
      // nothing there yet
      expect(await storage.hasData()).toBe(false)
    })

    test('returns true after a document is added', async () => {
      const { storage } = await setup()
      await storage.open()
      // add something
      const changeSet = { documentId: '123', changes: [] }
      await storage.appendChanges(changeSet)
      // now we haz data
      expect(await storage.hasData()).toBe(true)
    })
  })
})
