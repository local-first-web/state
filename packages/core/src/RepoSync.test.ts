import A from 'automerge'
import { TestChannel } from './lib/TestChannel'
import { Repo } from './Repo'
import { RepoSync } from './RepoSync'
import { Message } from './types'

export interface BirdCount {
  [bird: string]: number
}

const documentId = 'myDoc'

let testSeq = 0

// creates a RepoSync object using a simple channel
const makeConnection = async (key: string, repo: Repo<BirdCount>, channel: TestChannel) => {
  // hook up send
  const send = (msg: Message) => channel.write(key, msg)
  const sync = new RepoSync(repo, send)

  // hook up receive
  channel.on('data', (peer_id, msg) => {
    if (peer_id === key) return // ignore messages that we sent
    sync.receive(msg)
  })

  await sync.open()
  return sync
}

// returns a promise that resolves the next time a document is changed on the repo
const docChanged = (repo: Repo) => new Promise(ok => repo.addHandler(ok))

describe(`RepoSync`, () => {
  beforeEach(() => (testSeq += 1))

  describe('Changes after connecting', () => {
    let localRepo: Repo<BirdCount>
    let remoteRepo: Repo<BirdCount>

    beforeEach(async () => {
      localRepo = new Repo<BirdCount>('angry-cockatoo', `local-${testSeq}`)
      await localRepo.set(documentId, A.from({ swallows: 1 }, 'L'))

      remoteRepo = new Repo<BirdCount>('angry-cockatoo', `remote-${testSeq}`)
      await remoteRepo.set(documentId, A.from({}, 'R'))

      const channel = new TestChannel()
      await makeConnection('L', localRepo, channel)
      await makeConnection('R', remoteRepo, channel)
      await docChanged(remoteRepo)
    })

    it('should sync up initial state', async () => {
      const remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc).toEqual({ swallows: 1 })
    })

    it('should communicate local changes to remote', async () => {
      localRepo.change(documentId, s => (s.swallows = 2))
      await docChanged(remoteRepo)

      let remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc).toEqual({ swallows: 2 })
    })

    it('should communicate remote changes to local', async () => {
      remoteRepo.change(documentId, s => (s.swallows = 42))
      await docChanged(localRepo)

      let localDoc = await localRepo.get(documentId)
      expect(localDoc).toEqual({ swallows: 42 })
    })

    it('should sync ongoing changes both ways', async () => {
      localRepo.change(documentId, s => (s.orioles = 123))
      remoteRepo.change(documentId, s => (s.wrens = 555))
      await Promise.all([docChanged(localRepo), docChanged(remoteRepo)])

      const localDoc = await localRepo.get(documentId)
      const remoteDoc = await remoteRepo.get(documentId)
      const expected = { swallows: 1, orioles: 123, wrens: 555 }
      expect(localDoc).toEqual(expected)
      expect(remoteDoc).toEqual(expected)
    })

    describe('Sync new documents', () => {
      it('should sync up new documents from local', async () => {
        localRepo.set('xyz', A.from({ boo: 999 }, 'L'))
        await docChanged(remoteRepo)
        expect(await remoteRepo.get('xyz')).toEqual({ boo: 999 })
      })

      it('should sync up new documents from remote', async () => {
        remoteRepo.set('xyz', A.from({ boo: 999 }, 'R'))
        await docChanged(localRepo)
        expect(await localRepo.get('xyz')).toEqual({ boo: 999 })
      })

      it('should concurrently exchange new documents', async () => {
        await localRepo.set('abc', A.from({ wrens: 555 }, 'L'))
        await remoteRepo.set('qrs', A.from({ orioles: 123 }, 'R'))
        await Promise.all([docChanged(localRepo), docChanged(remoteRepo)])
        expect(await remoteRepo.get('abc')).toEqual({ wrens: 555 })
        expect(await localRepo.get('qrs')).toEqual({ orioles: 123 })
      })
    })
  })

  describe('Changes before connecting', () => {
    it('should sync after the fact', async () => {
      const localRepo = new Repo<BirdCount>('test', `local-${testSeq}`)
      await localRepo.set(documentId, A.from({}, 'L'))

      let localDoc = await localRepo.get(documentId)
      localDoc = A.change(localDoc, s => (s.wrens = 2))
      await localRepo.set(documentId, localDoc)

      const remoteRepo = new Repo<BirdCount>('test', `remote-${testSeq}`)
      await remoteRepo.set(documentId, A.from({}, 'R'))

      const channel = new TestChannel()
      await makeConnection('L', localRepo, channel)
      await makeConnection('R', remoteRepo, channel)

      await docChanged(remoteRepo)

      const expected = { wrens: 2 }
      expect(await remoteRepo.get(documentId)).toEqual(expected)
      expect(await localRepo.get(documentId)).toEqual(expected)
    })
  })

  describe('Intermittent connection', () => {
    let localConnection: RepoSync
    let remoteConnection: RepoSync
    let localRepo: Repo<BirdCount>
    let remoteRepo: Repo<BirdCount>
    let channel = new TestChannel()

    function networkOff() {
      channel.removeAllListeners()
      localConnection.close()
      remoteConnection.close()
    }

    async function networkOn() {
      channel = new TestChannel()
      localConnection = await makeConnection('L', localRepo, channel)
      remoteConnection = await makeConnection('R', remoteRepo, channel)
    }

    beforeEach(async () => {
      remoteRepo = new Repo('test', `remote-${testSeq}`)
      await remoteRepo.set(documentId, A.from({}, 'R'))
      localRepo = new Repo('test', `local-${testSeq}`)
      await localRepo.set(documentId, A.from({ swallows: 1 }, 'L'))
      networkOn()
      await docChanged(remoteRepo)
    })

    it('should sync local changes made while offline', async () => {
      // remote peer has original state
      await docChanged(remoteRepo)
      let remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc.swallows).toEqual(1)

      // make local changes online
      await localRepo.change(documentId, s => (s.swallows = 2))

      // remote peer sees changes immediately
      await docChanged(remoteRepo)
      remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc.swallows).toEqual(2)

      networkOff()

      // make local changes offline
      await localRepo.change(documentId, s => (s.swallows = 3))

      // remote peer doesn't see changes
      remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc.swallows).toEqual(2)

      await networkOn()

      // as soon as we're back online, remote peer sees changes
      await docChanged(remoteRepo)
      remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc.swallows).toEqual(3)
    })

    it('should bidirectionally sync offline changes', async () => {
      networkOff()

      // local peer makes changes
      await localRepo.change(documentId, s => (s.wrens = 1))

      // remote peer doesn't see local changes
      expect(await remoteRepo.get(documentId)).toEqual({ swallows: 1 })

      // remote peer makes changes
      await remoteRepo.change(documentId, s => (s.robins = 1))

      // local peer doesn't see remote changes
      expect(await localRepo.get(documentId)).toEqual({ swallows: 1, wrens: 1 })

      await networkOn()

      // as soon as we're back online, both peers see both changes
      const expected = {
        swallows: 1,
        robins: 1,
        wrens: 1,
      }

      await Promise.all([docChanged(localRepo), docChanged(remoteRepo)])

      expect(await localRepo.get(documentId)).toEqual(expected)
      expect(await remoteRepo.get(documentId)).toEqual(expected)
    })

    it('should resolve conflicts introduced while offline', async () => {
      networkOff()

      // local peer makes a change
      await localRepo.change(documentId, doc => (doc.swallows = 13))

      // remote peer doesn't see local changes
      expect(await remoteRepo.get(documentId)).toEqual({ swallows: 1 })

      // remote peer makes a conflicting change
      await remoteRepo.change(documentId, doc => (doc.swallows = 42))

      // local peer doesn't see remote changes
      expect(await localRepo.get(documentId)).toEqual({ swallows: 13 })

      await networkOn()

      // as soon as we're back online, one of the changes is selected

      await Promise.all([docChanged(localRepo), docChanged(remoteRepo)])

      let localDoc = await localRepo.get(documentId)
      let remoteDoc = await remoteRepo.get(documentId)

      const localValue = localDoc.swallows
      const remoteValue = remoteDoc.swallows

      expect(localValue).toEqual(remoteValue)

      // we don't know the exact value, but it's one of the two, and
      // the "losing" value is stored in `conflicts`
      const conflict = A.getConflicts(localDoc!, 'swallows')
      expect(localValue === 13 || (remoteValue === 42 && conflict.L === 13)).toBe(true)
      expect(remoteValue === 42 || (localValue === 13 && conflict.R === 42)).toBe(true)
    })
  })
})
