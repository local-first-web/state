import A, { Backend, Frontend, DocSet } from 'automerge'
import debug from 'debug'
import { Map } from 'immutable'

type ClockMap = Map<string, Clock>
type ClockMaps = { ours: ClockMap; theirs: ClockMap }

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
  private watchableDoc: A.WatchableDoc<A.Doc<T>>
  private sendMsg: (msg: A.Message<T>) => void
  private clock: ClockMaps

  constructor(watchableDoc: A.WatchableDoc<A.Doc<T>>, sendMsg: (msg: A.Message<T>) => void) {
    this.watchableDoc = watchableDoc
    this.sendMsg = sendMsg
    this.clock = { ours: Map(), theirs: Map() }
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
  receiveMsg({ docId, clock, changes }: { docId: string; clock: Clock; changes: A.Change<any>[] }) {
    // log('receive', { docId, clock, changes })
    // Record their clock value for this document
    if (clock) this.updateClock(theirs, docId, clock)

    const weHaveDoc = this.getState(docId) !== undefined

    // If they sent changes, apply them to our document
    if (changes) this.watchableDoc.applyChanges(changes)
    // If no changes and we have the document, treat it as a request for our latest changes
    else if (weHaveDoc) this.maybeSendChanges(docId)
    // If no changes and we don't have the document, treat it as an advertisement and request it
    else this.advertise(docId)

    // Return the current state of the document
    return this.watchableDoc.get()
  }

  // Private methods

  validateDoc(docId: string, clock: Clock) {
    const ourClock = this.getClock(docId, ours)

    // Make sure doc has a clock (i.e. is an automerge object)
    if (!clock) throw new TypeError(ERR_NOCLOCK)

    // Make sure the document is newer than what we already have
    if (!lessOrEqual(ourClock, clock)) throw new RangeError(ERR_OLDCLOCK)
  }

  registerDoc() {
    const docId = '' //this.watchableDoc.id
    const clock = this.getClockFromDoc(docId)
    this.validateDoc(docId, clock)
    // Advertise the document
    this.requestChanges(docId, clock)
    // Record the doc's initial clock
    this.updateClock(ours, docId, clock)
  }

  // Callback that is called by the watchableDoc whenever a document is changed
  docChanged() {
    log('doc changed')
    const docId = ''
    const clock = this.getClockFromDoc(docId)
    this.validateDoc(docId, clock)
    this.maybeSendChanges(docId)
    this.maybeRequestChanges(docId, clock)
    this.updateClock(ours, docId, clock)
  }

  // Send changes if we have more recent information than they do
  maybeSendChanges(docId: string) {
    const theirClock = (this.getClock(docId, theirs) as unknown) as A.Clock
    if (!theirClock) return

    const ourState = this.getState(docId) as T

    // If we have changes they don't have, send them
    const changes = Backend.getMissingChanges(ourState, theirClock)
    if (changes.length > 0) this.sendChanges(docId, changes)
  }

  sendChanges(docId: string, changes: A.Change<T>[]) {
    log('sending %s changes', changes.length)
    const clock = this.getClockFromDoc(docId)
    this.sendMsg({ docId, clock: clock.toJS(), changes })
    this.updateClock(ours, docId)
  }

  // Request changes if we're out of date
  maybeRequestChanges(docId: string, clock = this.getClockFromDoc(docId)) {
    const ourClock = this.getClock(docId, ours)
    // If the document is newer than what we have, request changes
    if (!lessOrEqual(clock, ourClock)) this.requestChanges(docId, clock)
  }

  // A message with no changes and a clock is a request for changes
  requestChanges(docId: string, clock = this.getClockFromDoc(docId)) {
    log('requesting changes')
    this.sendMsg({ docId, clock: clock.toJS() })
  }

  // A message with a docId and an empty clock is an advertisement for the document
  // (if we have it) or a request for the document (if we don't)
  advertise(docId: string) {
    this.sendMsg({ docId, clock: {} })
  }

  // Updates the vector clock for `docId` in the given `clockMap` (mapping from docId to vector
  // clock) by merging in the new vector clock `clock`, setting each node's sequence number has been
  // set to the maximum for that node.
  updateClock(which: keyof ClockMaps, docId: string, clock = this.getClockFromDoc(docId)) {
    const clockMap = this.clock[which]
    const oldClock = clockMap.get(docId, Map() as Clock)
    // Merge the clocks, keeping the maximum sequence number for each node
    const largestWins = (x: number, y: number): number => Math.max(x, y)
    const newClock = oldClock.mergeWith(largestWins, clock)
    // Update the clockMap
    this.clock[which] = clockMap.set(docId, newClock)
  }

  getState(docId: string): A.Doc<T> | undefined {
    const doc = this.watchableDoc.get() as A.Doc<T>
    if (doc) return Frontend.getBackendState(doc)
  }

  getClock(docId: string, which: 'ours'): Clock
  getClock(docId: string, which: 'theirs'): Clock | undefined
  getClock(docId: string, which: keyof ClockMaps): Clock | undefined {
    const initialClockValue =
      which === ours
        ? (Map() as Clock) // our default clock value is an empty clock
        : undefined // their default clock value is undefined
    return this.clock[which].get(docId, initialClockValue)
  }

  getClockFromDoc(docId: string) {
    const state = this.getState(docId)
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

