import A from 'automerge'
import { EventEmitter } from 'events'
import { DocSetSync } from './DocSetSync'
import { Message } from 'types'

interface BirdCounts {
  [key: string]: number
}

const makeConnection = (id: string, docSet: A.DocSet<any>, channel: Channel) => {
  const send = (msg: Message) => {
    // console.log(`${id} sends`, JSON.stringify(msg))
    channel.write(id, JSON.stringify(msg))
  }

  const docSetSync = new DocSetSync(docSet, send)

  channel.on('data', (peer_id, msg) => {
    if (peer_id === id) return // ignore messages that we sent
    // console.log(`${id} receives`, msg)
    docSetSync.receive(JSON.parse(msg))
  })

  docSetSync.open()
  return docSetSync
}

class Channel extends EventEmitter {
  write(id: string, msg: string) {
    this.emit('data', id, msg)
  }
}

describe(`DocSetSync`, () => {
  describe('Changes after connecting', () => {
    let localDocSet: A.DocSet<any>
    let remoteDocSet: A.DocSet<any>
    const ID = '123'

    beforeEach(() => {
      localDocSet = new A.DocSet()
      localDocSet.setDoc(ID, A.from<BirdCounts>({ swallows: 1 }, '1'))
      remoteDocSet = new A.DocSet()
      const remoteDoc = A.from<BirdCounts>({}, '2')
      console.log(A.getActorId(remoteDoc))
      remoteDocSet.setDoc(ID, remoteDoc)

      const channel = new Channel()
      makeConnection('1', localDocSet, channel)
      makeConnection('2', remoteDocSet, channel)
    })

    it('should sync up initial state', () => {
      expect(remoteDocSet.getDoc(ID)).toEqual({ swallows: 1 })
    })

    it('should communicate local changes to remote', () => {
      let localDoc = localDocSet.getDoc(ID)
      localDocSet.setDoc(ID, A.change<BirdCounts>(localDoc, s => (s.swallows = 2)))

      let remoteDoc = remoteDocSet.getDoc(ID)
      expect(remoteDoc).toEqual({ swallows: 2 })
    })

    it('should communicate remote changes to local', () => {
      let remoteDoc = remoteDocSet.getDoc(ID)
      remoteDocSet.setDoc(ID, A.change<BirdCounts>(remoteDoc, s => (s.swallows = 42)))

      let localDoc = localDocSet.getDoc(ID)
      expect(localDoc).toEqual({ swallows: 42 })
    })

    it.only('should sync up new documents', () => {
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
      localDocSet.setDoc(ID, A.change<BirdCounts>(localDoc, doc => (doc.orioles = 123)))

      const remoteDoc = remoteDocSet.getDoc(ID)
      remoteDocSet.setDoc(ID, A.change<BirdCounts>(remoteDoc, doc => (doc.wrens = 555)))

      expect(remoteDocSet.getDoc(ID)).toEqual({
        swallows: 1,
        orioles: 123,
        wrens: 555,
      })
    })
  })

  // describe('Changes before connecting', () => {
  //   it('should sync after the fact', () => {
  //     const ID = '123'

  //     const localDocSet = new DocSet()
  //     localDocSet.setDoc(ID, from({}, 'L'))

  //     let localDoc = localDocSet.getDoc(ID)
  //     localDoc = change(localDoc, doc => (doc.wrens = 2))
  //     localDocSet.setDoc(ID, localDoc)

  //     const remoteDocSet = new DocSet()
  //     remoteDocSet.setDoc(ID, A.from({}, 'R'))

  //     const channel = new Channel()
  //     makeConnection('L', localDocSet, channel)
  //     makeConnection('R', remoteDocSet, channel)

  //     const exp = {
  //       wrens: 2,
  //     }
  //     assert.deepEqual(remoteDocSet.getDoc(ID), exp)
  //     assert.deepEqual(localDocSet.getDoc(ID), exp)
  //   })
  // })

  // describe('Intermittent connection', () => {
  //   const ID = '123'
  //   let localConnection, remoteConnection
  //   let localDocSet, remoteDocSet
  //   let channel = new Channel()

  //   function networkOff() {
  //     channel.removeAllListeners()
  //     localConnection.close()
  //     remoteConnection.close()
  //   }

  //   function networkOn() {
  //     channel = new Channel()
  //     localConnection = makeConnection('L', localDocSet, channel)
  //     remoteConnection = makeConnection('R', remoteDocSet, channel)
  //   }

  //   beforeEach(() => {
  //     localDocSet = new DocSet()
  //     remoteDocSet = new DocSet()

  //     // only need to do this to get a known ActorID on remote -
  //     // otherwise everything works without it
  //     remoteDocSet.setDoc(ID, from({}, 'R'))

  //     networkOn()
  //     localDocSet.setDoc(ID, from({ swallows: 1 }, 'L'))
  //   })

  //   it('should sync local changes made while offline', () => {
  //     let localDoc = localDocSet.getDoc(ID)

  //     // remote peer has original state
  //     assert.equal(remoteDocSet.getDoc(ID).swallows, 1)

  //     // make local changes online
  //     localDoc = change(localDoc, doc => (doc.swallows = 2))
  //     localDocSet.setDoc(ID, localDoc)

  //     // remote peer sees changes immediately
  //     assert.equal(remoteDocSet.getDoc(ID).swallows, 2)

  //     networkOff()

  //     // make local changes offline
  //     localDoc = change(localDoc, doc => (doc.swallows = 3))
  //     localDocSet.setDoc(ID, localDoc)

  //     // remote peer doesn't see changes
  //     assert.equal(remoteDocSet.getDoc(ID).swallows, 2)

  //     networkOn()

  //     // as soon as we're back online, remote peer sees changes
  //     assert.equal(remoteDocSet.getDoc(ID).swallows, 3)
  //   })

  //   it('should bidirectionally sync offline changes', () => {
  //     let localDoc = localDocSet.getDoc(ID)
  //     let remoteDoc = remoteDocSet.getDoc(ID)

  //     networkOff()

  //     // local peer makes changes
  //     localDoc = change(localDoc, doc => (doc.wrens = 1))
  //     localDocSet.setDoc(ID, localDoc)

  //     // remote peer doesn't see local changes
  //     assert.deepEqual(remoteDocSet.getDoc(ID), { swallows: 1 })

  //     // remote peer makes changes
  //     remoteDoc = change(remoteDoc, doc => (doc.robins = 1))
  //     remoteDocSet.setDoc(ID, remoteDoc)

  //     // local peer doesn't see remote changes
  //     assert.deepEqual(localDocSet.getDoc(ID), { swallows: 1, wrens: 1 })

  //     networkOn()

  //     // HACK: is there a way to to avoid this?
  //     localDocSet.setDoc(ID, localDoc) // we just need this to trigger a sync

  //     // as soon as we're back online, both peers see both changes
  //     const expected = {
  //       swallows: 1,
  //       robins: 1,
  //       wrens: 1,
  //     }

  //     assert.deepEqual(localDocSet.getDoc(ID), expected)
  //     assert.deepEqual(remoteDocSet.getDoc(ID), expected)
  //   })

  //   it('should resolve conflicts introduced while offline', () => {
  //     let localDoc = localDocSet.getDoc(ID)
  //     let remoteDoc = remoteDocSet.getDoc(ID)

  //     networkOff()

  //     // local peer makes changes
  //     localDoc = change(localDoc, doc => (doc.swallows = 13))
  //     localDocSet.setDoc(ID, localDoc)

  //     // remote peer doesn't see local changes
  //     assert.deepEqual(remoteDocSet.getDoc(ID), { swallows: 1 })

  //     // remote peer makes changes
  //     remoteDoc = change(remoteDoc, doc => (doc.swallows = 42))
  //     remoteDocSet.setDoc(ID, remoteDoc)

  //     // local peer doesn't see remote changes
  //     assert.deepEqual(localDocSet.getDoc(ID), { swallows: 13 })

  //     networkOn()

  //     // HACK: is there a way to to avoid this?
  //     localDocSet.setDoc(ID, localDoc) // we just need this to trigger a sync

  //     // as soon as we're back online, one of the changes is selected
  //     localDoc = localDocSet.getDoc(ID)
  //     remoteDoc = remoteDocSet.getDoc(ID)
  //     const localValue = localDoc.swallows
  //     const remoteValue = remoteDoc.swallows
  //     assert.equal(localValue, remoteValue)

  //     // we don't know the exact value, but it's one of the two, and
  //     // the "losing" value is stored in `conflicts`
  //     const conflict = A.getConflicts(localDoc, 'swallows')
  //     assert.ok(localValue === 13 || (remoteValue === 42 && conflict.L === 13))
  //     assert.ok(remoteValue === 42 || (localValue === 13 && conflict.R === 42))
  //   })
  // })
})
