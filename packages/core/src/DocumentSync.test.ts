import A from 'automerge'
import { DocumentSync } from './DocumentSync'
import { Message } from './types'
import { TestChannel } from './lib/TestChannel'

export interface BirdCount {
  [bird: string]: number
}

const makeConnection = (
  id: string,
  watchableDoc: A.WatchableDoc<BirdCount>,
  channel: TestChannel<BirdCount>
) => {
  const send = (msg: Message<BirdCount>) => {
    channel.write(id, msg)
  }

  const connection = new DocumentSync(watchableDoc, send)

  channel.on('data', (peer_id, msg) => {
    if (peer_id === id) return // ignore messages that we sent
    connection.receive(msg)
  })

  connection.open()
  return connection
}

describe(`DocumentSync`, () => {
  describe('Changes after connecting', () => {
    let localWatchableDoc: A.WatchableDoc<BirdCount>
    let remoteWatchableDoc: A.WatchableDoc<BirdCount>
    const ID = '123'

    beforeEach(() => {
      localWatchableDoc = new A.WatchableDoc<BirdCount>(A.from({ swallows: 1 }))
      remoteWatchableDoc = new A.WatchableDoc<BirdCount>(A.from({}))

      const channel = new TestChannel<BirdCount>()
      makeConnection('1', localWatchableDoc, channel)
      makeConnection('2', remoteWatchableDoc, channel)
    })

    it('should sync up initial state', () => {
      expect(remoteWatchableDoc.get()).toEqual({ swallows: 1 })
    })

    it('should communicate local changes to remote', () => {
      let localDoc = localWatchableDoc.get()
      localWatchableDoc.set(A.change(localDoc, s => (s.swallows = 2)))

      let remoteDoc = remoteWatchableDoc.get()
      expect(remoteDoc).toEqual({ swallows: 2 })
    })

    it('should communicate remote changes to local', () => {
      let remoteDoc = remoteWatchableDoc.get()
      remoteWatchableDoc.set(A.change(remoteDoc, s => (s.swallows = 42)))

      let localDoc = localWatchableDoc.get()
      expect(localDoc).toEqual({ swallows: 42 })
    })

    it('should sync ongoing changes both ways', () => {
      const localDoc = localWatchableDoc.get()
      localWatchableDoc.set(A.change(localDoc, doc => (doc.orioles = 123)))

      const remoteDoc = remoteWatchableDoc.get()
      remoteWatchableDoc.set(A.change(remoteDoc, doc => (doc.wrens = 555)))

      expect(remoteWatchableDoc.get()).toEqual({
        swallows: 1,
        orioles: 123,
        wrens: 555,
      })
    })
  })

  describe('Changes before connecting', () => {
    it('should sync after the fact', () => {
      const ID = '123'

      const localWatchableDoc = new A.WatchableDoc<BirdCount>(A.from({}))

      let localDoc = localWatchableDoc.get()
      localDoc = A.change(localDoc, doc => (doc.wrens = 2))
      localWatchableDoc.set(localDoc)

      const remoteWatchableDoc = new A.WatchableDoc<BirdCount>(A.from({}))

      const channel = new TestChannel()
      makeConnection('L', localWatchableDoc, channel)
      makeConnection('R', remoteWatchableDoc, channel)

      const exp = {
        wrens: 2,
      }
      expect(remoteWatchableDoc.get()).toEqual(exp)
      expect(localWatchableDoc.get()).toEqual(exp)
    })
  })

  describe('Intermittent connection', () => {
    const ID = '123'
    let localConnection: DocumentSync<BirdCount>
    let remoteConnection: DocumentSync<BirdCount>
    let localWatchableDoc: A.WatchableDoc<BirdCount>
    let remoteWatchableDoc: A.WatchableDoc<BirdCount>
    let channel = new TestChannel()

    function networkOff() {
      channel.removeAllListeners()
      localConnection.close()
      remoteConnection.close()
    }

    function networkOn() {
      channel = new TestChannel()
      localConnection = makeConnection('L', localWatchableDoc, channel)
      remoteConnection = makeConnection('R', remoteWatchableDoc, channel)
    }

    beforeEach(() => {
      // A.from but allowing us to set an ActorID
      const init = (s: BirdCount, actorId: string) => {
        return A.change(A.init<BirdCount>(actorId), d => (d = Object.assign(d, s)))
      }

      // only need to do this to get a known ActorID on remote -
      // otherwise everything works without it
      remoteWatchableDoc = new A.WatchableDoc(init({}, 'R'))
      localWatchableDoc = new A.WatchableDoc(init({ swallows: 1 }, 'L'))
      networkOn()

      // console.log({ remoteWatchableDoc, localWatchableDoc })
    })

    it('should sync local changes made while offline', () => {
      let localDoc = localWatchableDoc.get()

      // remote peer has original state
      expect(remoteWatchableDoc.get().swallows).toEqual(1)

      // make local changes online
      localDoc = A.change(localDoc, doc => (doc.swallows = 2))
      localWatchableDoc.set(localDoc)

      // remote peer sees changes immediately
      expect(remoteWatchableDoc.get().swallows).toEqual(2)

      networkOff()

      // make local changes offline
      localDoc = A.change(localDoc, doc => (doc.swallows = 3))
      localWatchableDoc.set(localDoc)

      // remote peer doesn't see changes
      expect(remoteWatchableDoc.get().swallows).toEqual(2)

      networkOn()

      // as soon as we're back online, remote peer sees changes
      expect(remoteWatchableDoc.get().swallows).toEqual(3)
    })

    it('should bidirectionally sync offline changes', () => {
      let localDoc = localWatchableDoc.get()
      let remoteDoc = remoteWatchableDoc.get()

      networkOff()

      // local peer makes changes
      localDoc = A.change(localDoc, doc => (doc.wrens = 1))
      localWatchableDoc.set(localDoc)

      // remote peer doesn't see local changes
      expect(remoteWatchableDoc.get()).toEqual({ swallows: 1 })

      // remote peer makes changes
      remoteDoc = A.change(remoteDoc, doc => (doc.robins = 1))
      remoteWatchableDoc.set(remoteDoc)

      // local peer doesn't see remote changes
      expect(localWatchableDoc.get()).toEqual({ swallows: 1, wrens: 1 })

      networkOn()

      // HACK: is there a way to to avoid this?
      localWatchableDoc.set(localDoc) // we just need this to trigger a sync

      // as soon as we're back online, both peers see both changes
      const expected = {
        swallows: 1,
        robins: 1,
        wrens: 1,
      }

      expect(localWatchableDoc.get()).toEqual(expected)
      expect(remoteWatchableDoc.get()).toEqual(expected)
    })

    it('should resolve conflicts introduced while offline', () => {
      let localDoc = localWatchableDoc.get()
      let remoteDoc = remoteWatchableDoc.get()

      networkOff()

      // local peer makes changes
      localDoc = A.change(localDoc, doc => (doc.swallows = 13))
      localWatchableDoc.set(localDoc)

      // remote peer doesn't see local changes
      expect(remoteWatchableDoc.get()).toEqual({ swallows: 1 })

      // remote peer makes changes
      remoteDoc = A.change(remoteDoc, doc => (doc.swallows = 42))
      remoteWatchableDoc.set(remoteDoc)

      // local peer doesn't see remote changes
      expect(localWatchableDoc.get()).toEqual({ swallows: 13 })

      networkOn()

      // HACK: is there a way to to avoid this?
      localWatchableDoc.set(localDoc) // we just need this to trigger a sync

      // as soon as we're back online, one of the changes is selected
      localDoc = localWatchableDoc.get()
      remoteDoc = remoteWatchableDoc.get()
      const localValue = localDoc.swallows
      const remoteValue = remoteDoc.swallows
      expect(localValue).toEqual(remoteValue)

      // we don't know the exact value, but it's one of the two, and
      // the "losing" value is stored in `conflicts`
      const conflict = A.getConflicts(localDoc, 'swallows')
      expect(localValue === 13 || (remoteValue === 42 && conflict.L === 13)).toBe(true)
      expect(remoteValue === 42 || (localValue === 13 && conflict.R === 42)).toBe(true)
    })
  })
})
