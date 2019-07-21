import A, { Backend, Frontend, DocSet } from 'automerge'
import debug from 'debug'
import { Map } from 'immutable'

type Clocks = { ours: Clock; theirs: Clock }

const log = debug('cevitxe:Aconnection')

// Keeps track of the communication with one particular peer. Allows updates for many documents to
// be multiplexed over a single connection.
//
// To integrate a connection with a particular networking stack, two functions are used:
// * `sendMsg` (callback passed to the constructor, will be called when local state is updated)
//   takes a message as argument, and sends it out to the remote peer.
// * `receiveMsg` (method on the connection object) should be called by the network stack when a
//   message is received from the remote peer.
//
// The document to be synced is managed by a `WatchableDoc`. Whenever it is changed locally, call
// `set()` on the WatchableDoc. The connection registers a callback on the WatchableDoc, and it
// figures out whenever there are changes that need to be sent to the remote peer.
//
// "`theirClock"` is the most recent VClock that we think the peer has (either because they've told
// us that it's their clock, or because it corresponds to a state we have sent to them on this
// connection). Thus, everything more recent than theirClock should be sent to the peer.
//
// `ourClock` is the most recent VClock that we've advertised to the peer (i.e. where we've told the
// peer that we have it).
export class AConnection<T> {
  private watchableDoc: A.WatchableDoc<A.Doc<T>, T>
  private sendMsg: (msg: Message<T>) => void
  private clocks: Clocks

  constructor(watchableDoc: A.WatchableDoc<A.Doc<T>, T>, sendMsg: (msg: Message<T>) => void) {
    this.watchableDoc = watchableDoc
    this.sendMsg = sendMsg
    this.clocks = { ours: Map(), theirs: Map() }
  }

  // Public API

  open() {
    // Process initial state of each existing doc
    log('open')
    this.registerDoc() // TODO: remove !

    // Subscribe to watchableDoc changes
    this.watchableDoc.registerHandler(this.docChanged.bind(this))
  }

  close() {
    log('close')
    // Unsubscribe from watchableDoc changes
    this.watchableDoc.unregisterHandler(this.docChanged.bind(this))
  }

  // Called by the network stack whenever it receives a message from a peer
  receiveMsg({ clock, changes }: { clock: Clock; changes: A.Change<any>[] }) {
    // log('receive', { docId, clock, changes })
    // Record their clock value for this document
    if (clock) this.updateClock(theirs, clock)

    // const weHaveDoc = this.getState(docId) !== undefined

    // If they sent changes, apply them to our document
    if (changes) this.watchableDoc.applyChanges(changes)
    // If no changes and we have the document, treat it as a request for our latest changes
    else this.maybeSendChanges()

    // Return the current state of the document
    return this.watchableDoc.get()
  }

  // Private methods

  validateDoc(clock: Clock) {
    const ourClock = this.getClock(ours)

    // Make sure doc has a clock (i.e. is an automerge object)
    if (!clock) throw new TypeError(ERR_NOCLOCK)

    // Make sure the document is newer than what we already have
    if (!lessOrEqual(ourClock, clock)) throw new RangeError(ERR_OLDCLOCK)
  }

  registerDoc() {
    const clock = this.getClockFromDoc()
    this.validateDoc(clock)
    // Advertise the document
    this.requestChanges(clock)
    // Record the doc's initial clock
    this.updateClock(ours, clock)
  }

  // Callback that is called by the watchableDoc whenever a document is changed
  docChanged() {
    log('doc changed')
    const clock = this.getClockFromDoc()
    this.validateDoc(clock)
    this.maybeSendChanges()
    this.maybeRequestChanges(clock)
    this.updateClock(ours, clock)
  }

  // Send changes if we have more recent information than they do
  maybeSendChanges() {
    const theirClock = (this.getClock(theirs) as unknown) as A.Clock
    if (!theirClock) return

    const ourState = this.getState() as T

    // If we have changes they don't have, send them
    const changes = Backend.getMissingChanges(ourState, theirClock)
    if (changes.length > 0) this.sendChanges(changes)
  }

  sendChanges(changes: A.Change<T>[]) {
    log('sending %s changes', changes.length)
    const clock = this.getClockFromDoc()
    this.sendMsg({ clock: clock.toJS(), changes })
    this.updateClock(ours)
  }

  // Request changes if we're out of date
  maybeRequestChanges(clock = this.getClockFromDoc()) {
    const ourClock = this.getClock(ours)
    // If the document is newer than what we have, request changes
    if (!lessOrEqual(clock, ourClock)) this.requestChanges(clock)
  }

  // A message with no changes and a clock is a request for changes
  requestChanges(clock = this.getClockFromDoc()) {
    log('requesting changes')
    this.sendMsg({ clock: clock.toJS() })
  }

  // Updates the vector clock for `docId` in the given `clockMap` (mapping from docId to vector
  // clock) by merging in the new vector clock `clock`, setting each node's sequence number has been
  // set to the maximum for that node.
  updateClock(which: keyof Clocks, clock = this.getClockFromDoc()) {
    const oldClock = this.clocks[which] || Map()
    // Merge the clocks, keeping the maximum sequence number for each node
    const largestWins = (x: number, y: number): number => Math.max(x, y)
    const newClock = oldClock.mergeWith(largestWins, clock)
    // Update the clockMap
    this.clocks[which] = newClock
  }

  getState(): A.Doc<T> | undefined {
    const doc = this.watchableDoc.get() as A.Doc<T>
    if (doc) return Frontend.getBackendState(doc)
  }

  getClock(which: 'ours'): Clock
  getClock(which: 'theirs'): Clock | undefined
  getClock(which: keyof Clocks): Clock | undefined {
    const initialClockValue =
      which === ours
        ? (Map() as Clock) // our default clock value is an empty clock
        : undefined // their default clock value is undefined
    return this.clocks[which] || initialClockValue
  }

  getClockFromDoc() {
    const state = this.getState()
    if (state === undefined) return
    else return (state as any).getIn(['opSet', 'clock'])
  }
}

const ERR_OLDCLOCK = 'Cannot pass an old state object to a connection'
const ERR_NOCLOCK =
  'This object cannot be used for network sync. ' +
  'Are you trying to sync a snapshot from the history?'

const ours = 'ours'
const theirs = 'theirs'

function lessOrEqual(clock1: Clock, clock2: Clock) {
  return clock1
    .keySeq()
    .concat(clock2.keySeq())
    .reduce((result, key) => result && clock1.get(key, 0) <= clock2.get(key, 0), true)
}

// TODO: Need to apply this change in the Automerge repo
type Clock = Map<string, number>

export interface Message<T> {
  clock: Clock
  changes?: A.Change<T>[]
}
