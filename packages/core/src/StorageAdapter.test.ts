import { IdbAdapter } from './idbAdapter'
import { newid } from 'cevitxe-signal-client'

const adapters = [IdbAdapter]

for (const Adapter of adapters) {
  const setup = async () => {
    const storage = new Adapter({ discoveryKey: 'silly-coder', databaseName: `test-${newid()}` })
    return { storage }
  }

  describe(Adapter.name, () => {
    describe('open', () => {
      test(`doesn't crash`, async () => {
        const { storage } = await setup()
        await storage.open()
      })
    })

    describe('close', () => {
      test(`doesn't crash`, async () => {
        const { storage } = await setup()
        await storage.open()
        await storage.close()
      })
    })

    describe('snapshots', () => {
      test('`snapshots` getter', async () => {
        const { storage } = await setup()
        await storage.open()

        const documentId = '123'
        const snapshot = { foo: 42 }
        const clock = { local: 1 }

        await storage.putSnapshot({ documentId, snapshot, clock })

        for await (const cursor of storage.snapshots)
          expect(cursor.value).toEqual({ documentId, snapshot, clock })
      })
    })

    test('deleteSnapshot', async () => {
      const { storage } = await setup()
      await storage.open()

      const documentId = '123'
      const snapshot = { foo: 42 }
      const clock = { local: 1 }

      await storage.putSnapshot({ documentId, snapshot, clock })

      await storage.deleteSnapshot(documentId)

      let count = 0
      for await (const cursor of storage.snapshots) count++
      expect(count).toBe(0)
    })

    describe('changes', () => {
      test('`changes` getter', async () => {
        const { storage } = await setup()
        await storage.open()
        const changeSet = { documentId: '123', changes: [] }
        await storage.appendChanges(changeSet)

        for await (const cursor of storage.changes)
          expect(cursor.value).toEqual(expect.objectContaining(changeSet)) // just one
      })

      test('getChanges', async () => {
        const { storage } = await setup()
        await storage.open()
        const changeSet = { documentId: '123', changes: [] }
        await storage.appendChanges(changeSet)

        expect(await storage.getChanges('123')).toEqual([expect.objectContaining(changeSet)])
      })
    })

    describe('hasData', () => {
      test('returns false on a newly created adapter', async () => {
        const { storage } = await setup()
        await storage.open()
        expect(await storage.hasData()).toBe(false)
      })

      test('returns true after a document is added', async () => {
        const { storage } = await setup()
        await storage.open()
        expect(await storage.hasData()).toBe(false)

        const changeSet = { documentId: '123', changes: [] }
        await storage.appendChanges(changeSet)
        expect(await storage.hasData()).toBe(true)
      })
    })
  })
}
