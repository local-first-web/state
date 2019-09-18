import A from 'automerge'
import { DocSet } from './lib/automerge'
import { DocSetSync } from './DocSetSync'
import { Message } from './types'
import { TestChannel } from './lib/TestChannel'

export interface BirdCount {
  [bird: string]: number
}

const docId = 'myDoc'

const makeConnection = (
  discoveryKey: string,
  docSet: DocSet<BirdCount>,
  channel: TestChannel<BirdCount>
) => {
  const send = (msg: Message) => {
    channel.write(discoveryKey, msg)
  }

  const connection = new DocSetSync(docSet, send)
  channel.on('data', (peer_id, msg) => {
    if (peer_id === discoveryKey) return // ignore messages that we sent
    connection.receive(msg)
  })

  connection.open()
  return connection
}

describe(`DocumentSync`, () => {
  describe('Changes after connecting', () => {
    let localDocSet: DocSet<BirdCount>
    let remoteDocSet: DocSet<BirdCount>

    beforeEach(() => {
      localDocSet = new DocSet<BirdCount>()
      localDocSet.setDoc(docId, A.from({ swallows: 1 }, 'L'))
      remoteDocSet = new DocSet<BirdCount>()
      remoteDocSet.setDoc(docId, A.from({}, 'R'))

      const channel = new TestChannel<BirdCount>()
      makeConnection('L', localDocSet, channel)
      makeConnection('R', remoteDocSet, channel)
    })

    it('should sync up initial state', () => {
      expect(remoteDocSet.getDoc(docId)).toEqual({ swallows: 1 })
    })

    it('should communicate local changes to remote', () => {
      let localDoc = localDocSet.getDoc(docId)
      localDocSet.setDoc(docId, A.change(localDoc, s => (s.swallows = 2)))

      let remoteDoc = remoteDocSet.getDoc(docId)
      expect(remoteDoc).toEqual({ swallows: 2 })
    })

    it('should communicate remote changes to local', () => {
      let remoteDoc = remoteDocSet.getDoc(docId)
      remoteDocSet.setDoc(docId, A.change(remoteDoc, s => (s.swallows = 42)))

      let localDoc = localDocSet.getDoc(docId)
      expect(localDoc).toEqual({ swallows: 42 })
    })

    it('should sync ongoing changes both ways', () => {
      const localDoc = localDocSet.getDoc(docId)
      localDocSet.setDoc(docId, A.change(localDoc, doc => (doc.orioles = 123)))

      const remoteDoc = remoteDocSet.getDoc(docId)
      remoteDocSet.setDoc(docId, A.change(remoteDoc, doc => (doc.wrens = 555)))

      expect(remoteDocSet.getDoc(docId)).toEqual({
        swallows: 1,
        orioles: 123,
        wrens: 555,
      })
    })

    describe('Sync new documents', () => {
      it('should sync up new documents from local', () => {
        localDocSet.setDoc('xyz', A.from({ boo: 999 }, 'L'))
        expect(remoteDocSet.getDoc('xyz')).toEqual({ boo: 999 })
      })

      it('should sync up new documents from remote', () => {
        remoteDocSet.setDoc('xyz', A.from({ boo: 999 }, 'R'))
        expect(localDocSet.getDoc('xyz')).toEqual({ boo: 999 })
      })

      it('should concurrently exchange new documents', () => {
        localDocSet.setDoc('abc', A.from({ wrens: 555 }, 'L'))
        remoteDocSet.setDoc('qrs', A.from({ orioles: 123 }, 'R'))

        expect(1).toEqual(1)
        expect(remoteDocSet.getDoc('abc')).toEqual({ wrens: 555 })
        expect(localDocSet.getDoc('qrs')).toEqual({ orioles: 123 })
      })
    })
  })

  describe('Changes before connecting', () => {
    it('should sync after the fact', () => {
      const localDocSet = new DocSet<BirdCount>()
      localDocSet.setDoc(docId, A.from({}, 'L'))

      let localDoc = localDocSet.getDoc(docId)
      localDoc = A.change(localDoc, doc => (doc.wrens = 2))
      localDocSet.setDoc(docId, localDoc)

      const remoteDocSet = new DocSet<BirdCount>()
      remoteDocSet.setDoc(docId, A.from({}, 'R'))

      const channel = new TestChannel()
      makeConnection('L', localDocSet, channel)
      makeConnection('R', remoteDocSet, channel)

      const exp = {
        wrens: 2,
      }
      expect(remoteDocSet.getDoc(docId)).toEqual(exp)
      expect(localDocSet.getDoc(docId)).toEqual(exp)
    })
  })

  describe('Intermittent connection', () => {
    let localConnection: DocSetSync
    let remoteConnection: DocSetSync
    let localDocSet: DocSet<BirdCount>
    let remoteDocSet: DocSet<BirdCount>
    let channel = new TestChannel()

    function networkOff() {
      channel.removeAllListeners()
      localConnection.close()
      remoteConnection.close()
    }

    function networkOn() {
      channel = new TestChannel()
      localConnection = makeConnection('L', localDocSet, channel)
      remoteConnection = makeConnection('R', remoteDocSet, channel)
    }

    beforeEach(() => {
      // new version of A.from that allows passing options to initialState
      // const from = <T>(initialState: T, options: any) =>
      //   A.change(A.init(options), 'Initialization', doc => Object.assign(doc, initialState))

      // only need to do this to get a known ActorID on remote -
      // otherwise everything works without it
      remoteDocSet = new DocSet()
      remoteDocSet.setDoc(docId, A.from({}, 'R'))
      localDocSet = new DocSet()
      localDocSet.setDoc(docId, A.from({ swallows: 1 }, 'L'))
      networkOn()
    })

    it('should sync local changes made while offline', () => {
      let localDoc = localDocSet.getDoc(docId)

      // remote peer has original state
      expect(remoteDocSet.getDoc(docId).swallows).toEqual(1)

      // make local changes online
      localDoc = A.change(localDoc, doc => (doc.swallows = 2))
      localDocSet.setDoc(docId, localDoc)

      // remote peer sees changes immediately
      expect(remoteDocSet.getDoc(docId).swallows).toEqual(2)

      networkOff()

      // make local changes offline
      localDoc = A.change(localDoc, doc => (doc.swallows = 3))
      localDocSet.setDoc(docId, localDoc)

      // remote peer doesn't see changes
      expect(remoteDocSet.getDoc(docId).swallows).toEqual(2)

      networkOn()

      // as soon as we're back online, remote peer sees changes
      expect(remoteDocSet.getDoc(docId).swallows).toEqual(3)
    })

    it('should bidirectionally sync offline changes', () => {
      let localDoc = localDocSet.getDoc(docId)
      let remoteDoc = remoteDocSet.getDoc(docId)

      networkOff()

      // local peer makes changes
      localDoc = A.change(localDoc, doc => (doc.wrens = 1))
      localDocSet.setDoc(docId, localDoc)

      // remote peer doesn't see local changes
      expect(remoteDocSet.getDoc(docId)).toEqual({ swallows: 1 })

      // remote peer makes changes
      remoteDoc = A.change(remoteDoc, doc => (doc.robins = 1))
      remoteDocSet.setDoc(docId, remoteDoc)

      // local peer doesn't see remote changes
      expect(localDocSet.getDoc(docId)).toEqual({ swallows: 1, wrens: 1 })

      networkOn()

      // HACK: is there a way to to avoid this?
      localDocSet.setDoc(docId, localDoc) // we just need this to trigger a sync

      // as soon as we're back online, both peers see both changes
      const expected = {
        swallows: 1,
        robins: 1,
        wrens: 1,
      }

      expect(localDocSet.getDoc(docId)).toEqual(expected)
      expect(remoteDocSet.getDoc(docId)).toEqual(expected)
    })

    it('should resolve conflicts introduced while offline', () => {
      let localDoc = localDocSet.getDoc(docId)
      let remoteDoc = remoteDocSet.getDoc(docId)

      networkOff()

      // local peer makes changes
      localDoc = A.change(localDoc, doc => (doc.swallows = 13))
      localDocSet.setDoc(docId, localDoc)

      // remote peer doesn't see local changes
      expect(remoteDocSet.getDoc(docId)).toEqual({ swallows: 1 })

      // remote peer makes changes
      remoteDoc = A.change(remoteDoc, doc => (doc.swallows = 42))
      remoteDocSet.setDoc(docId, remoteDoc)

      // local peer doesn't see remote changes
      expect(localDocSet.getDoc(docId)).toEqual({ swallows: 13 })

      networkOn()

      // HACK: is there a way to to avoid this?
      localDocSet.setDoc(docId, localDoc) // we just need this to trigger a sync

      // as soon as we're back online, one of the changes is selected
      localDoc = localDocSet.getDoc(docId)
      remoteDoc = remoteDocSet.getDoc(docId)
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
