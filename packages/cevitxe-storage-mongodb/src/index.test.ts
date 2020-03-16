import { MongoAdapter } from '.'
import { newid } from 'cevitxe-signal-client'

const pause = (t = 100) => new Promise(yes => setTimeout(() => yes(), t))

describe('MongoAdapter', () => {
  const setup = async () => {
    const storage = new MongoAdapter({
      discoveryKey: 'sly-mongoose',
      databaseName: `test-${newid()}`,
    })
    await pause()
    return { storage }
  }

  afterEach(() => {})

  describe('open & close', () => {
    test(`doesn't crash`, async () => {
      const { storage } = await setup()
      await storage.open()
      // yay nothing blew up
      // clean up
      await pause()
      await storage.close()
    })
  })

  describe('snapshots', () => {
    test('putSnapshot', async () => {
      const { storage } = await setup()
      await storage.open()
      const documentId = '123'
      const snapshot = { foo: 42 }
      const clock = { local: 1 }
      // add a snapshot
      await storage.putSnapshot({ documentId, snapshot, clock })
      // should be the only one there
      for await (const s of storage.snapshots()) expect(s).toEqual({ documentId, snapshot, clock })
      // clean up
      await storage.close()
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
      for await (const cursor of storage.snapshots()) count++
      expect(count).toBe(0)
      // clean up
      await storage.close()
    })
  })

  describe('changes', () => {
    test('changes', async () => {
      const { storage } = await setup()
      await storage.open()
      const changeSet = { documentId: '123', changes: [] }
      // add a changeset
      await storage.appendChanges(changeSet)
      // should be the only one there
      for await (const c of storage.changes()) expect(c).toEqual(expect.objectContaining(changeSet))
      // clean up
      await storage.close()
    })

    test('getChanges', async () => {
      const { storage } = await setup()
      await storage.open()
      const changeSet = { documentId: '123', changes: [] }
      // add a changeset
      await storage.appendChanges(changeSet)
      // retrieve it & confirm it looks right
      expect(await storage.getChanges('123')).toEqual([expect.objectContaining(changeSet)])
      // clean up
      await storage.close()
    })
  })

  describe('hasData', () => {
    test('returns false on a newly created adapter', async () => {
      const { storage } = await setup()
      await storage.open()
      // nothing there yet
      expect(await storage.hasData()).toBe(false)
      // clean up
      await storage.close()
    })

    test('returns true after a document is added', async () => {
      const { storage } = await setup()
      await storage.open()
      // add something
      const changeSet = { documentId: '123', changes: [] }
      await storage.appendChanges(changeSet)
      // now we haz data
      expect(await storage.hasData()).toBe(true)
      // clean up
      await storage.close()
    })
  })
})
