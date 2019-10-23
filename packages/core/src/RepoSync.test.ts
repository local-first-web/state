import A from 'automerge'
import { TestChannel } from './TestChannel'
import { Repo } from './Repo'
import { RepoSync } from './RepoSync'
import { Message } from './Message'
import { pause as _yield } from './pause'
import debug from 'debug'
import { newid } from 'cevitxe-signal-client'

const log = debug('cevitxe:test')

export interface BirdCount {
  [bird: string]: number
}

const documentId = 'myDoc'

// creates a RepoSync object using a simple channel
const makeConnection = async (key: string, repo: Repo<BirdCount>, channel: TestChannel) => {
  // hook up send
  const send = (msg: Message) => channel.write(key, msg)
  const sync = new RepoSync(repo, send)
  await sync.open()

  // hook up receive
  channel.addListener('data', (peer_id, msg) => {
    if (peer_id === key) return // ignore messages that we sent
    log('receiving', peer_id, msg)
    sync.receive(msg)
  })
  channel.addPeer()

  return sync
}

// returns a promise that resolves the next time a document is changed on the repo
const docChanged = (repo: Repo) => new Promise(ok => repo.addHandler(ok))

describe(`RepoSync`, () => {
  describe('Changes after connecting', () => {
    const setup = async () => {
      const discoveryKey = 'angry-cockatoo'
      const localRepo = new Repo<BirdCount>({
        discoveryKey,
        databaseName: `local-${newid()}`,
        clientId: 'local',
      })
      await localRepo.open()
      const remoteRepo = new Repo<BirdCount>({
        discoveryKey,
        databaseName: `remote-${newid()}`,
        clientId: 'remote',
      })
      await remoteRepo.open()
      const channel = new TestChannel()
      return { localRepo, remoteRepo, channel }
    }

    it('should communicate local changes to remote', async () => {
      const { localRepo, remoteRepo, channel } = await setup()

      await makeConnection('R', remoteRepo, channel)
      await makeConnection('L', localRepo, channel)

      await localRepo.set(documentId, A.from({ swallows: 1 }, 'L'))
      await remoteRepo.set(documentId, A.from({}, 'R'))

      await _yield()
      const remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc).toEqual({ swallows: 1 })
    })

    it('should communicate remote changes to local', async () => {
      const { localRepo, remoteRepo, channel } = await setup()

      await makeConnection('R', remoteRepo, channel)
      await makeConnection('L', localRepo, channel)

      await localRepo.set(documentId, A.from({ swallows: 1 }, 'L'))
      await _yield()

      expect(await localRepo.get(documentId)).toEqual({ swallows: 1 })

      await remoteRepo.change(documentId, s => (s.swallows = 42))
      await _yield()

      expect(await localRepo.get(documentId)).toEqual({ swallows: 42 })
    })

    it('should sync ongoing changes both ways', async () => {
      const { localRepo, remoteRepo, channel } = await setup()

      await makeConnection('R', remoteRepo, channel)
      await makeConnection('L', localRepo, channel)

      await localRepo.change(documentId, s => (s.orioles = 123))
      await remoteRepo.change(documentId, s => (s.wrens = 555))
      await _yield()

      const localDoc = await localRepo.get(documentId)
      const remoteDoc = await remoteRepo.get(documentId)

      const expected = { orioles: 123, wrens: 555 }

      expect(localDoc).toEqual(expected)
      expect(remoteDoc).toEqual(expected)
    })

    it('should sync up new documents from local', async () => {
      const { localRepo, remoteRepo, channel } = await setup()

      await makeConnection('R', remoteRepo, channel)
      await makeConnection('L', localRepo, channel)

      localRepo.set('xyz', A.from({ boo: 999 }, 'L'))
      await docChanged(remoteRepo)
      expect(await remoteRepo.get('xyz')).toEqual({ boo: 999 })
    })

    it('should sync up new documents from remote', async () => {
      const { localRepo, remoteRepo, channel } = await setup()

      await makeConnection('R', remoteRepo, channel)
      await makeConnection('L', localRepo, channel)

      remoteRepo.set('xyz', A.from({ boo: 999 }, 'R'))
      await docChanged(localRepo)
      expect(await localRepo.get('xyz')).toEqual({ boo: 999 })
    })

    it('should concurrently exchange new documents', async () => {
      const { localRepo, remoteRepo, channel } = await setup()

      await makeConnection('R', remoteRepo, channel)
      await makeConnection('L', localRepo, channel)

      await localRepo.set('abc', A.from({ wrens: 555 }, 'L'))
      await remoteRepo.set('qrs', A.from({ orioles: 123 }, 'R'))
      await Promise.all([docChanged(localRepo), docChanged(remoteRepo)])
      expect(await remoteRepo.get('abc')).toEqual({ wrens: 555 })
      expect(await localRepo.get('qrs')).toEqual({ orioles: 123 })
    })
  })

  describe('Changes before connecting', () => {
    const setup = async () => {
      const discoveryKey = 'miffed-bratwurst'
      const localRepo = new Repo<BirdCount>({
        discoveryKey,
        databaseName: `local-${newid()}`,
        clientId: 'L',
      })
      await localRepo.open()
      const remoteRepo = new Repo<BirdCount>({
        discoveryKey,
        databaseName: `remote-${newid()}`,
        clientId: 'R',
      })
      await remoteRepo.open()
      return { localRepo, remoteRepo }
    }

    const makeConnections = async (localRepo: Repo, remoteRepo: Repo) => {
      const channel = new TestChannel()
      await makeConnection('L', localRepo, channel) //** */
      await makeConnection('R', remoteRepo, channel)
      await _yield()
    }

    it('should communicate prior local changes to remote', async () => {
      const { localRepo, remoteRepo } = await setup()

      await localRepo.set(documentId, A.from({ wrens: 2, swallows: 1, vultures: 234 }, 'L'))
      await _yield()
      await remoteRepo.set(documentId, A.from({ ['andean condors']: 34 }, 'R'))
      await _yield()

      await makeConnections(localRepo, remoteRepo)

      const expected = { wrens: 2, swallows: 1, vultures: 234, ['andean condors']: 34 }
      expect(await remoteRepo.get(documentId)).toEqual(expected)
      expect(await localRepo.get(documentId)).toEqual(expected)
    })

    it('should sync up local documents created before connecting', async () => {
      const { localRepo, remoteRepo } = await setup()

      await localRepo.set('doc1', A.from({ wrens: 2 }, 'L'))
      await _yield()

      await makeConnections(localRepo, remoteRepo)

      const expected = { wrens: 2 }
      expect(await localRepo.get('doc1')).toEqual(expected)
      expect(await remoteRepo.get('doc1')).toEqual(expected)
    })

    it('should sync up prior remote documents', async () => {
      const { localRepo, remoteRepo } = await setup()

      await remoteRepo.set('doc1', A.from({ wrens: 2 }, 'R'))
      await _yield()

      await makeConnections(localRepo, remoteRepo)

      const expected = { wrens: 2 }
      expect(await localRepo.get('doc1')).toEqual(expected)
      expect(await remoteRepo.get('doc1')).toEqual(expected)
    })

    it('should concurrently exchange new documents', async () => {
      const { localRepo, remoteRepo } = await setup()

      await localRepo.set('doc1', A.from({ condors: 37 }, 'L'))
      await remoteRepo.set('doc2', A.from({ wrens: 2 }, 'R'))
      await _yield()

      await makeConnections(localRepo, remoteRepo)

      expect(await localRepo.get('doc1')).toEqual({ condors: 37 })
      expect(await remoteRepo.get('doc1')).toEqual({ condors: 37 })
      expect(await localRepo.get('doc2')).toEqual({ wrens: 2 })
      expect(await remoteRepo.get('doc2')).toEqual({ wrens: 2 })
    })
  })

  describe('Intermittent connection', () => {
    let localConnection: RepoSync
    let remoteConnection: RepoSync
    let localRepo: Repo<BirdCount>
    let remoteRepo: Repo<BirdCount>
    let channel = new TestChannel()

    // random actorIDs so we don't know which is sorted higher
    const localActor = `${newid()}-local`
    const remoteActor = `${newid()}-remote`

    function networkOff() {
      channel.removeAllListeners()
      localConnection.close()
      remoteConnection.close()
    }

    async function networkOn() {
      channel = new TestChannel()
      localConnection = await makeConnection('L', localRepo, channel)
      remoteConnection = await makeConnection('R', remoteRepo, channel)
      await _yield()
    }

    beforeEach(async () => {
      const discoveryKey = 'test'
      remoteRepo = new Repo({
        discoveryKey,
        databaseName: `remote-${newid()}`,
        clientId: remoteActor,
      })
      await remoteRepo.open()
      localRepo = new Repo({
        discoveryKey,
        databaseName: `local-${newid()}`,
        clientId: localActor,
      })
      await localRepo.open()

      await remoteRepo.set(documentId, A.from<BirdCount>({}))
      await localRepo.set(documentId, A.from<BirdCount>({ swallows: 1 }))

      await networkOn()

      // both peers now have the same value
      expect(await localRepo.get(documentId)).toEqual({ swallows: 1 })
      expect(await remoteRepo.get(documentId)).toEqual({ swallows: 1 })
    })

    it('should sync local changes made while offline', async () => {
      // remote peer has original state
      let remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc!.swallows).toEqual(1)

      // make local changes online
      await localRepo.change(documentId, s => (s.swallows = 2))

      // remote peer sees changes immediately
      await docChanged(remoteRepo)
      remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc!.swallows).toEqual(2)

      networkOff()

      // make local changes offline
      await localRepo.change(documentId, s => (s.swallows = 3))

      // remote peer doesn't see changes
      remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc!.swallows).toEqual(2)

      await networkOn()

      // as soon as we're back online, remote peer sees changes
      remoteDoc = await remoteRepo.get(documentId)
      expect(remoteDoc!.swallows).toEqual(3)
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

      await _yield()
      expect(await localRepo.get(documentId)).toEqual(expected)
      expect(await remoteRepo.get(documentId)).toEqual(expected)
    })

    it('should resolve conflicts introduced while offline', async () => {
      networkOff()

      // local peer makes a change
      const localCount = 13
      await localRepo.change(documentId, s => (s.swallows = localCount))
      await _yield()

      // remote peer doesn't see local changes
      expect(await remoteRepo.get(documentId)).toEqual({ swallows: 1 })

      // remote peer makes a conflicting change
      const remoteCount = 42
      await remoteRepo.change(documentId, s => (s.swallows = remoteCount))
      await _yield()

      // local peer doesn't see remote changes
      expect(await localRepo.get(documentId)).toEqual({ swallows: localCount })

      await networkOn()

      // as soon as we're back online, one of the changes is selected
      const localDoc = await localRepo.get(documentId)
      const remoteDoc = await remoteRepo.get(documentId)

      const localValue = localDoc!.swallows
      const remoteValue = remoteDoc!.swallows

      // we don't know which value won the conflict, but:

      // 1. we know both sides ended up with the same value
      expect(localValue).toEqual(remoteValue)

      // 2. we know the winning value one of the two
      expect(localValue === localCount || localValue === remoteCount).toBe(true)
      expect(remoteValue === localCount || remoteValue === remoteCount).toBe(true)

      // 3. the losing value is stored in `conflicts`
      const conflicts = A.getConflicts(localDoc!, 'swallows')
      if (localValue === remoteCount) expect(conflicts[localActor]).toBe(localCount) // remote won, local's value stored in conflicts
      if (localValue === localCount) expect(conflicts[remoteActor]).toBe(remoteCount) // local won, remote's value stored in conflicts
    })
  })
})
