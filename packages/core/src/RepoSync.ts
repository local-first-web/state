import A from 'automerge'
import debug from 'debug'
import { Map } from 'immutable'
import { Repo } from './Repo'
import { lessOrEqual } from './lib/lessOrEqual'
import { Message, SEND_CHANGES, ADVERTISE_DOC, REQUEST_CHANGES, REQUEST_DOC } from './Message'

type Clock = Map<string, number>
type ClockMap = Map<string, Clock>
type Clocks = { ours: ClockMap; theirs: ClockMap }

/**
 * One instance of `RepoSync` keeps one local document in sync with one remote peer's replica of
 * the same document.
 *
 * This class works with a local `Repo`; it listens for changes to the document, and if it
 * thinks it has changes that the remote peer doesn't know about, it generates a message to be sent
 * the peer. It also processes messages from its counterpart on the peer, and applies them to the
 * local document as needed.
 *
 * This class doesn't get involved in the actual transmission of the messages; it only generates
 * them for someone else to send, and processes them when someone else receives them. To integrate a
 * connection with a particular networking stack, two functions are used:
 *
 * - `send` (callback passed to the constructor, will be called when local state is updated) takes a
 *   message as argument, and sends it out to the remote peer.
 * - `receive` (method on the connection object) should be called by the network stack when a
 *   message is received from the remote peer.
 *
 * In this context, networking is provided by the Cevitxe `Connection` class.
 *
 * The document to be synced is managed by a `Repo`. Whenever it is changed locally, call
 * `setDoc()` on the Repo. The connection registers a callback on the Repo, and it
 * figures out whenever there are changes that need to be sent to the remote peer.
 *
 * To do this, we keep track of two clocks: ours and theirs.
 *
 * - "Their" clock is the most recent VClock that we think the peer has (either because they've told
 *   us that it's their clock, or because it corresponds to a state we have sent to them on this
 *   connection). Thus, everything more recent than theirClock should be sent to the peer.
 *
 * - "Our" clock is the most recent VClock that we've advertised to the peer (i.e. where we've told
 *   the peer that we have it).
 *
 * > Note: This class began life as a vendored & refactored copy of the `Automerge.Connection`
 * > class; if you're familiar with that class, this one plays exactly the same role.
 */
export class RepoSync {
  public repo: Repo<any>
  private send: (msg: Message) => void
  private clock: Clocks
  private log: debug.Debugger

  /**
   * @param repo An `Automerge.Repo` containing the document being synchronized.
   * @param send Callback function, called when the local document changes. Should send the given
   * message to the remote peer.
   */
  constructor(repo: Repo<any>, send: (msg: Message) => void) {
    this.repo = repo
    this.send = send
    this.clock = { ours: Map(), theirs: Map() }
    this.log = debug(`cevitxe:docsetsync:${repo.databaseName}`)
  }

  // Public API

  async open() {
    // if (this.repo.documentIds.length === -1) {
    //   // request entire repo
    // } else {
    for (let documentId of this.repo.documentIds) //
      if (documentId.length) await this.registerDoc(documentId)
    // }
    this.repo.addHandler(this.onDocChanged.bind(this))
  }

  close() {
    this.log('close')
    this.repo.removeHandler(this.onDocChanged.bind(this))
  }

  weHaveDoc(documentId: string) {
    return this.repo.getSnapshot(documentId) !== undefined
  }

  // Called by the network stack whenever it receives a message from a peer
  async receive({
    documentId,
    clock,
    changes,
  }: {
    documentId: string
    clock: Clock
    changes?: A.Change[]
  }): Promise<A.Doc<any>> {
    this.log('receive', documentId)
    // Record their clock value for this document
    if (clock) this.updateClock(documentId, theirs, clock)

    // If they sent changes, apply them to our document
    if (changes) await this.repo.applyChanges(documentId, changes)
    // If no changes, treat it as a request for our latest changes
    else if (this.weHaveDoc(documentId)) await this.maybeSendChanges(documentId)
    // If no changes and we don't have the document, treat it as an advertisement and request it
    else this.requestDoc(documentId)

    // Return the current state of the document
    return this.repo.get(documentId)
  }

  // Private methods

  private async registerDoc(documentId: string) {
    this.log('registerDoc', documentId)

    const clock = await this.getClockFromDoc(documentId)
    this.validateDoc(documentId, clock)
    // Advertise the document
    await this.advertise(documentId, clock)
    // Record the doc's initial clock
    await this.updateClock(documentId, ours, clock)
  }

  private validateDoc(documentId: string, clock: Clock) {
    this.log('validateDoc', documentId)
    const ourClock = this.getClock(documentId, ours)

    // Make sure doc has a clock (i.e. is an automerge object)
    if (!clock) throw new TypeError(ERR_NOCLOCK)

    // Make sure the document is newer than what we already have
    if (!lessOrEqual(ourClock, clock)) {
      throw new RangeError(ERR_OLDCLOCK)
    }
  }

  // Callback that is called by the repo whenever a document is changed
  private async onDocChanged(documentId: string) {
    this.log('onDocChanged', documentId)
    const clock = await this.getClockFromDoc(documentId)
    this.validateDoc(documentId, clock)
    await this.maybeSendChanges(documentId)
    await this.maybeRequestChanges(documentId, clock)
    this.updateClock(documentId, ours, clock)
  }

  // Send changes if we have more recent information than they do
  private async maybeSendChanges(documentId: string) {
    this.log('maybeSendChanges', documentId)
    const theirClock = (this.getClock(documentId, theirs) as unknown) as A.Clock
    if (theirClock === undefined) return

    const ourState = await this.getState(documentId)

    // If we have changes they don't have, send them
    const changes = A.Backend.getMissingChanges(ourState!, theirClock)
    if (changes.length > 0) await this.sendChanges(documentId, changes)
  }

  private async sendChanges(documentId: string, changes: A.Change[]) {
    this.log('sendChanges', documentId)
    const clock = await this.getClockFromDoc(documentId)
    this.send({
      type: SEND_CHANGES,
      documentId,
      clock: clock.toJS() as any,
      changes,
    })
    this.updateClock(documentId, ours)
  }

  // Request changes if we're out of date
  private async maybeRequestChanges(
    documentId: string,
    clock: Clock | Promise<Clock> = this.getClockFromDoc(documentId)
  ) {
    this.log('maybeRequestChanges', documentId)
    const ourClock = this.getClock(documentId, ours)
    // If the document is newer than what we have, request changes
    if (!lessOrEqual(await clock, ourClock)) this.requestChanges(documentId, clock)
  }

  private async advertise(
    documentId: string,
    clock: Clock | Promise<Clock> = this.getClockFromDoc(documentId)
  ) {
    this.log('requestChanges', documentId)
    this.send({
      type: ADVERTISE_DOC,
      documentId,
      clock: (await clock).toJS() as any,
    })
  }

  private async requestChanges(
    documentId: string,
    clock: Clock | Promise<Clock> = this.getClockFromDoc(documentId)
  ) {
    this.log('requestChanges', documentId)
    this.send({
      type: REQUEST_CHANGES,
      documentId,
      clock: (await clock).toJS() as any,
    })
  }

  // A message with a documentId and an empty clock is a request for the document
  private requestDoc(documentId: string) {
    this.send({ type: REQUEST_DOC, documentId, clock: {} })
  }

  // overloads
  getClock(documentId: string, which: 'ours'): Clock
  getClock(documentId: string, which: 'theirs'): Clock | undefined
  // implementation
  getClock(documentId: string, which: keyof Clocks): Clock | undefined {
    const initialClockValue =
      which === ours
        ? (Map() as Clock) // our default clock value is an empty clock
        : undefined // their default clock value is undefined
    return this.clock[which].get(documentId, initialClockValue)
  }

  private async getClockFromDoc(documentId: string): Promise<Clock> {
    if (!this.weHaveDoc(documentId)) return Map() as Clock
    const state = (await this.getState(documentId)) as any
    return state.getIn(['opSet', 'clock'])
  }

  // Updates the vector clock by merging in the new vector clock `clock`, setting each node's
  // sequence number has been set to the maximum for that node.
  private async updateClock(documentId: string, which: keyof Clocks, clock?: Clock) {
    if (clock === undefined) clock = await this.getClockFromDoc(documentId)
    const clockMap = this.clock[which]
    const oldClock = clockMap.get(documentId, Map() as Clock)
    // Merge the clocks, keeping the maximum sequence number for each node
    const largestWins = (x: number = 0, y: number = 0): number => Math.max(x, y)
    const newClock = oldClock.mergeWith(largestWins, clock!)
    this.clock[which] = clockMap.set(documentId, newClock)
  }

  private async getState(documentId: string) {
    const doc = await this.repo.get(documentId)
    if (doc) return A.Frontend.getBackendState(doc)
  }
}

const ERR_OLDCLOCK = 'Cannot pass an old state object to a connection'
const ERR_NOCLOCK =
  'This object cannot be used for network sync. ' +
  'Are you trying to sync a snapshot from the history?'

const ours = 'ours'
const theirs = 'theirs'
