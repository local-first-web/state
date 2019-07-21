import A from 'automerge'
import { DocSet, AConnection } from './AConnection'
import { EventEmitter } from 'events'

interface BirdCount {
  [bird: string]: number
}

const makeConnection = (id: string, docSet: DocSet<BirdCount>, channel: Channel) => {
  const send = (msg: A.Message<BirdCount>) => {
    // console.log(`${id} sends`, JSON.stringify(msg))
    channel.write(id, msg)
  }

  const connection = new AConnection(docSet, send)

  channel.on('data', (peer_id, msg) => {
    if (peer_id === id) return // ignore messages that we sent
    // console.log(`${id} receives`, msg)
    connection.receiveMsg(msg)
  })

  connection.open()
  return connection
}

class Channel extends EventEmitter {
  write(id: string, msg: A.Message<BirdCount>) {
    this.emit('data', id, msg)
  }
}

describe(`A.Connection`, () => {
  describe('Changes after connecting', () => {
    let localDocSet: DocSet<BirdCount>
    let remoteDocSet: DocSet<BirdCount>
    const ID = '123'

    beforeEach(() => {
      localDocSet = new A.DocSet<BirdCount>()
      localDocSet.setDoc(ID, A.from({ swallows: 1 }))
      remoteDocSet = new A.DocSet<BirdCount>()
      remoteDocSet.setDoc(ID, A.from({}))

      const channel = new Channel()
      makeConnection('1', localDocSet, channel)
      makeConnection('2', remoteDocSet, channel)
    })

    it('should sync up initial state', () => {
      expect(remoteDocSet.getDoc(ID)).toEqual({ swallows: 1 })
    })

    it('should communicate local changes to remote', () => {
      let localDoc = localDocSet.getDoc(ID)
      localDocSet.setDoc(ID, A.change(localDoc, s => (s.swallows = 2)))

      let remoteDoc = remoteDocSet.getDoc(ID)
      expect(remoteDoc).toEqual({ swallows: 2 })
    })

    it('should communicate remote changes to local', () => {
      let remoteDoc = remoteDocSet.getDoc(ID)
      remoteDocSet.setDoc(ID, A.change(remoteDoc, s => (s.swallows = 42)))

      let localDoc = localDocSet.getDoc(ID)
      expect(localDoc).toEqual({ swallows: 42 })
    })

    it('should sync up new documents', () => {
      localDocSet.setDoc('xyz', A.from({ boo: 999 }))
      expect(remoteDocSet.getDoc('xyz')).toEqual({ boo: 999 })
    })

    it('should concurrently exchange new documents', () => {
      localDocSet.setDoc('abc', A.from({ wrens: 555 }))
      remoteDocSet.setDoc('qrs', A.from({ orioles: 123 }))

      expect(remoteDocSet.getDoc('abc')).toEqual({ wrens: 555 })
      expect(localDocSet.getDoc('qrs')).toEqual({ orioles: 123 })
    })

    it('should sync ongoing changes both ways', () => {
      const localDoc = localDocSet.getDoc(ID)
      localDocSet.setDoc(ID, A.change(localDoc, doc => (doc.orioles = 123)))

      const remoteDoc = remoteDocSet.getDoc(ID)
      remoteDocSet.setDoc(ID, A.change(remoteDoc, doc => (doc.wrens = 555)))

      expect(remoteDocSet.getDoc(ID)).toEqual({
        swallows: 1,
        orioles: 123,
        wrens: 555,
      })
    })
  })

  describe('Changes before connecting', () => {
    it('should sync after the fact', () => {
      const ID = '123'

      const localDocSet = new A.DocSet<BirdCount>()
      localDocSet.setDoc(ID, A.from({}))

      let localDoc = localDocSet.getDoc(ID)
      localDoc = A.change(localDoc, doc => (doc.wrens = 2))
      localDocSet.setDoc(ID, localDoc)

      const remoteDocSet = new A.DocSet<BirdCount>()
      remoteDocSet.setDoc(ID, A.from({}))

      const channel = new Channel()
      makeConnection('L', localDocSet, channel)
      makeConnection('R', remoteDocSet, channel)

      const exp = {
        wrens: 2,
      }
      expect(remoteDocSet.getDoc(ID)).toEqual(exp)
      expect(localDocSet.getDoc(ID)).toEqual(exp)
    })
  })

  describe('Intermittent connection', () => {
    const ID = '123'
    let localConnection: AConnection<BirdCount>
    let remoteConnection: AConnection<BirdCount>
    let localDocSet: DocSet<BirdCount>
    let remoteDocSet: DocSet<BirdCount>
    let channel = new Channel()

    function networkOff() {
      channel.removeAllListeners()
      localConnection.close()
      remoteConnection.close()
    }

    function networkOn() {
      channel = new Channel()
      localConnection = makeConnection('L', localDocSet, channel)
      remoteConnection = makeConnection('R', remoteDocSet, channel)
    }

    beforeEach(() => {
      localDocSet = new A.DocSet()
      remoteDocSet = new A.DocSet()

      // A.from but allowing 
      const init = (s: BirdCount, actorId: string) => {
        return A.change(A.init(actorId), d => (d = Object.assign(d, s)))
      }

      // only need to do this to get a known ActorID on remote -
      // otherwise everything works without it
      remoteDocSet.setDoc(ID, init({}, 'R'))

      networkOn()
      localDocSet.setDoc(ID, init({ swallows: 1 }, 'L'))
    })

    it('should sync local changes made while offline', () => {
      let localDoc = localDocSet.getDoc(ID)

      // remote peer has original state
      expect(remoteDocSet.getDoc(ID).swallows).toEqual(1)

      // make local changes online
      localDoc = A.change(localDoc, doc => (doc.swallows = 2))
      localDocSet.setDoc(ID, localDoc)

      // remote peer sees changes immediately
      expect(remoteDocSet.getDoc(ID).swallows).toEqual(2)

      networkOff()

      // make local changes offline
      localDoc = A.change(localDoc, doc => (doc.swallows = 3))
      localDocSet.setDoc(ID, localDoc)

      // remote peer doesn't see changes
      expect(remoteDocSet.getDoc(ID).swallows).toEqual(2)

      networkOn()

      // as soon as we're back online, remote peer sees changes
      expect(remoteDocSet.getDoc(ID).swallows).toEqual(3)
    })

    it('should bidirectionally sync offline changes', () => {
      let localDoc = localDocSet.getDoc(ID)
      let remoteDoc = remoteDocSet.getDoc(ID)

      networkOff()

      // local peer makes changes
      localDoc = A.change(localDoc, doc => (doc.wrens = 1))
      localDocSet.setDoc(ID, localDoc)

      // remote peer doesn't see local changes
      expect(remoteDocSet.getDoc(ID)).toEqual({ swallows: 1 })

      // remote peer makes changes
      remoteDoc = A.change(remoteDoc, doc => (doc.robins = 1))
      remoteDocSet.setDoc(ID, remoteDoc)

      // local peer doesn't see remote changes
      expect(localDocSet.getDoc(ID)).toEqual({ swallows: 1, wrens: 1 })

      networkOn()

      // HACK: is there a way to to avoid this?
      localDocSet.setDoc(ID, localDoc) // we just need this to trigger a sync

      // as soon as we're back online, both peers see both changes
      const expected = {
        swallows: 1,
        robins: 1,
        wrens: 1,
      }

      expect(localDocSet.getDoc(ID)).toEqual(expected)
      expect(remoteDocSet.getDoc(ID)).toEqual(expected)
    })

    it('should resolve conflicts introduced while offline', () => {
      let localDoc = localDocSet.getDoc(ID)
      let remoteDoc = remoteDocSet.getDoc(ID)

      networkOff()

      // local peer makes changes
      localDoc = A.change(localDoc, doc => (doc.swallows = 13))
      localDocSet.setDoc(ID, localDoc)

      // remote peer doesn't see local changes
      expect(remoteDocSet.getDoc(ID)).toEqual({ swallows: 1 })

      // remote peer makes changes
      remoteDoc = A.change(remoteDoc, doc => (doc.swallows = 42))
      remoteDocSet.setDoc(ID, remoteDoc)

      // local peer doesn't see remote changes
      expect(localDocSet.getDoc(ID)).toEqual({ swallows: 13 })

      networkOn()

      // HACK: is there a way to to avoid this?
      localDocSet.setDoc(ID, localDoc) // we just need this to trigger a sync

      // as soon as we're back online, one of the changes is selected
      localDoc = localDocSet.getDoc(ID)
      remoteDoc = remoteDocSet.getDoc(ID)
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
