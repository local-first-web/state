import A from 'automerge'
import { Repo } from './Repo'
import { RepoSync } from './RepoSync'
import { Message } from './types'
import { TestChannel } from './lib/TestChannel'
import { pause } from './lib/pause'

require('fake-indexeddb/auto')

export interface BirdCount {
  [bird: string]: number
}

const documentId = 'myDoc'

const makeConnection = (discoveryKey: string, repo: Repo<BirdCount>, channel: TestChannel) => {
  const send = (msg: Message) => {
    channel.write(discoveryKey, msg)
  }

  const connection = new RepoSync(repo, send)

  channel.on('data', (peer_id, msg) => {
    if (peer_id === discoveryKey) return // ignore messages that we sent
    connection.receive(msg)
  })

  connection.open()
  return connection
}

describe(`RepoSync`, () => {
  describe('Changes after connecting', () => {
    let localRepo: Repo<BirdCount>
    let remoteRepo: Repo<BirdCount>

    beforeEach(async () => {
      localRepo = new Repo<BirdCount>('angry-cockatoo', 'local')
      await localRepo.set(documentId, A.from({ swallows: 1 }, 'L'))

      remoteRepo = new Repo<BirdCount>('angry-cockatoo', 'remote')
      await remoteRepo.set(documentId, A.from({}, 'R'))

      const channel = new TestChannel()
      makeConnection('L', localRepo, channel)
      makeConnection('R', remoteRepo, channel)
      await pause(1)
    })

    it('should sync up initial state', async () => {
      const doc = await remoteRepo.get(documentId)
      console.log(remoteRepo.state[documentId])
      expect(doc).toEqual({ swallows: 1 })
    })

    // it('should communicate local changes to remote', async () => {
    //   localRepo.change(documentId, s => (s.swallows = 2))

    //   let remoteDoc = remoteRepo.get(documentId)
    //   expect(remoteDoc).toEqual({ swallows: 2 })
    // })

    // it('should communicate remote changes to local', () => {
    //   remoteRepo.change(documentId, s => (s.swallows = 42))

    //   let localDoc = localRepo.get(documentId)
    //   expect(localDoc).toEqual({ swallows: 42 })
    // })

    // it('should sync ongoing changes both ways', () => {
    //   localRepo.change(documentId, doc => (doc.orioles = 123))

    //   remoteRepo.change(documentId, doc => (doc.wrens = 555))

    //   expect(remoteRepo.get(documentId)).toEqual({
    //     swallows: 1,
    //     orioles: 123,
    //     wrens: 555,
    //   })
    // })

    // describe('Sync new documents', () => {
    //   it('should sync up new documents from local', () => {
    //     localRepo.set('xyz', A.from({ boo: 999 }, 'L'))
    //     expect(remoteRepo.get('xyz')).toEqual({ boo: 999 })
    //   })

    //   it('should sync up new documents from remote', () => {
    //     remoteRepo.set('xyz', A.from({ boo: 999 }, 'R'))
    //     expect(localRepo.get('xyz')).toEqual({ boo: 999 })
    //   })

    //   it('should concurrently exchange new documents', () => {
    //     localRepo.set('abc', A.from({ wrens: 555 }, 'L'))
    //     remoteRepo.set('qrs', A.from({ orioles: 123 }, 'R'))

    //     expect(1).toEqual(1)
    //     expect(remoteRepo.get('abc')).toEqual({ wrens: 555 })
    //     expect(localRepo.get('qrs')).toEqual({ orioles: 123 })
    //   })
  })
})

// describe('Changes before connecting', () => {
//   it('should sync after the fact', () => {
//     const localRepo = new Repo<BirdCount>('test', 'test')
//     localRepo.set(documentId, A.from({}, 'L'))

//     let localDoc = localRepo.get(documentId)
//     localDoc = A.change(localDoc, doc => (doc.wrens = 2))
//     localRepo.set(documentId, localDoc)

//     const remoteRepo = new Repo<BirdCount>('test', 'test')
//     remoteRepo.set(documentId, A.from({}, 'R'))

//     const channel = new TestChannel()
//     makeConnection('L', localRepo, channel)
//     makeConnection('R', remoteRepo, channel)

//     const exp = {
//       wrens: 2,
//     }
//     expect(remoteRepo.get(documentId)).toEqual(exp)
//     expect(localRepo.get(documentId)).toEqual(exp)
//   })
// })

// describe('Intermittent connection', () => {
//   let localConnection: RepoSync
//   let remoteConnection: RepoSync
//   let localRepo: Repo<BirdCount>
//   let remoteRepo: Repo<BirdCount>
//   let channel = new TestChannel()

//   function networkOff() {
//     channel.removeAllListeners()
//     localConnection.close()
//     remoteConnection.close()
//   }

//   function networkOn() {
//     channel = new TestChannel()
//     localConnection = makeConnection('L', localRepo, channel)
//     remoteConnection = makeConnection('R', remoteRepo, channel)
//   }

//   beforeEach(() => {
//     remoteRepo = new Repo('test', 'test')
//     remoteRepo.set(documentId, A.from({}, 'R'))
//     localRepo = new Repo('test', 'test')
//     localRepo.set(documentId, A.from({ swallows: 1 }, 'L'))
//     networkOn()
//   })

//   it('should sync local changes made while offline', () => {
//     let localDoc = localRepo.get(documentId)

//     // remote peer has original state
//     expect(remoteRepo.get(documentId)!.swallows).toEqual(1)

//     // make local changes online
//     localDoc = A.change(localDoc, doc => (doc.swallows = 2))
//     localRepo.set(documentId, localDoc)

//     // remote peer sees changes immediately
//     expect(remoteRepo.get(documentId)!.swallows).toEqual(2)

//     networkOff()

//     // make local changes offline
//     localDoc = A.change(localDoc, doc => (doc.swallows = 3))
//     localRepo.set(documentId, localDoc)

//     // remote peer doesn't see changes
//     expect(remoteRepo.get(documentId)!.swallows).toEqual(2)

//     networkOn()

//     // as soon as we're back online, remote peer sees changes
//     expect(remoteRepo.get(documentId)!.swallows).toEqual(3)
//   })

//   it('should bidirectionally sync offline changes', () => {
//     let localDoc = localRepo.get(documentId)
//     let remoteDoc = remoteRepo.get(documentId)

//     networkOff()

//     // local peer makes changes
//     localDoc = A.change(localDoc, doc => (doc.wrens = 1))
//     localRepo.set(documentId, localDoc)

//     // remote peer doesn't see local changes
//     expect(remoteRepo.get(documentId)).toEqual({ swallows: 1 })

//     // remote peer makes changes
//     remoteDoc = A.change(remoteDoc, doc => (doc.robins = 1))
//     remoteRepo.set(documentId, remoteDoc)

//     // local peer doesn't see remote changes
//     expect(localRepo.get(documentId)).toEqual({ swallows: 1, wrens: 1 })

//     networkOn()

//     // HACK: is there a way to to avoid this?
//     localRepo.set(documentId, localDoc) // we just need this to trigger a sync

//     // as soon as we're back online, both peers see both changes
//     const expected = {
//       swallows: 1,
//       robins: 1,
//       wrens: 1,
//     }

//     expect(localRepo.get(documentId)).toEqual(expected)
//     expect(remoteRepo.get(documentId)).toEqual(expected)
//   })

//   it('should resolve conflicts introduced while offline', () => {
//     let localDoc = localRepo.get(documentId)
//     let remoteDoc = remoteRepo.get(documentId)

//     networkOff()

//     // local peer makes changes
//     localDoc = A.change(localDoc, doc => (doc.swallows = 13))
//     localRepo.set(documentId, localDoc)

//     // remote peer doesn't see local changes
//     expect(remoteRepo.get(documentId)).toEqual({ swallows: 1 })

//     // remote peer makes changes
//     remoteDoc = A.change(remoteDoc, doc => (doc.swallows = 42))
//     remoteRepo.set(documentId, remoteDoc)

//     // local peer doesn't see remote changes
//     expect(localRepo.get(documentId)).toEqual({ swallows: 13 })

//     networkOn()

//     // HACK: is there a way to to avoid this?
//     localRepo.set(documentId, localDoc) // we just need this to trigger a sync

//     // as soon as we're back online, one of the changes is selected
//     localDoc = localRepo.get(documentId)
//     remoteDoc = remoteRepo.get(documentId)
//     const localValue = localDoc!.swallows
//     const remoteValue = remoteDoc!.swallows
//     expect(localValue).toEqual(remoteValue)

//     // we don't know the exact value, but it's one of the two, and
//     // the "losing" value is stored in `conflicts`
//     const conflict = A.getConflicts(localDoc!, 'swallows')
//     expect(localValue === 13 || (remoteValue === 42 && conflict.L === 13)).toBe(true)
//     expect(remoteValue === 42 || (localValue === 13 && conflict.R === 42)).toBe(true)
//   })
// })
// })
