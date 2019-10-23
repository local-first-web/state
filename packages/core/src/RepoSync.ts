import A from 'automerge'
import debug from 'debug'
import { Map } from 'immutable'
import { isMoreRecent, mergeClocks } from './clocks'
import * as message from './Message'
import { Message } from './Message'
import { Repo } from './Repo'
import { Clock, ClockMap, PlainClock, RepoHistory, RepoSnapshot } from './types'

/**
 * A vector clock is a map, where the keys are the actorIds of all actors that have been active on a
 * particular document, and the values are the most recent sequence number for that actor. The
 * sequence number starts at 1 and increments every time an actor makes a change.
 */

const EMPTY_CLOCK: Clock = Map()
const EMPTY_CLOCKMAP: ClockMap = Map()

const EMPTY_CLOCK_PLAIN: PlainClock = {}

/**
 * One instance of `RepoSync` keeps one local document in sync with one remote peer's replica of the
 * same document.
 *
 * This class works with a local `Repo`; it listens for changes to documents, and if it thinks it
 * has changes that the remote peer doesn't know about, it generates a message to be sent the peer.
 * It also processes messages from its counterpart on the peer, and applies them to local documents
 * as needed.
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
 * The document to be synced is managed by a `Repo`. Whenever it is changed locally, call `setDoc()`
 * on the Repo. The connection registers a callback on the repo, and it figures out whenever there
 * are changes that need to be sent to the remote peer.
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
  private clock: { ours: ClockMap; theirs: ClockMap }
  private log: debug.Debugger
  private isOpen = false

  /**
   * @param repo A `Repo` containing the document being synchronized.
   * @param send Callback function, called when the local document changes. Provided by the
   * networking stack. Should send the given message to the remote peer.
   */
  constructor(repo: Repo<any>, send: (msg: Message) => void) {
    this.repo = repo
    this.send = send
    this.clock = this.getClocks()
    this.log = debug(`cevitxe:reposync:${repo.databaseName}`)
  }

  getClocks() {
    const ours = EMPTY_CLOCKMAP
    const theirs = EMPTY_CLOCKMAP
    return { ours, theirs }
  }

  // Public API

  async open() {
    this.log('open')

    this.isOpen = true
    for (let documentId of this.repo.documentIds)
      if (!this.clock.ours.get(documentId)) await this.registerDoc(documentId)

    this.repo.addHandler(this.onDocChanged.bind(this))
    await this.sendHello()
  }

  close() {
    this.log('close')
    this.isOpen = false
    this.repo.removeHandler(this.onDocChanged.bind(this))
  }

  /**
   * Called by the network stack whenever it receives a message from a peer
   * @param msg
   */
  async receive(msg: Message) {
    if (!this.isOpen) return // don't respond to messages after closing

    this.log('receive', msg)

    switch (msg.type) {
      case message.HELLO: {
        // they are introducing themselves by saying how many documents they have
        const theirCount: number = +msg.documentCount
        const ourCount: number = +this.repo.count
        this.log('received hello ', { theirCount, ourCount })
        if (theirCount === 0 && ourCount === 0) {
          // neither of us has anything, nothing to talk about until we get documents
          this.log('nothing to do')
        } else if (theirCount === 0 && ourCount > 0) {
          // we have documents and they have none, so let's send them everything we have
          this.log('sending everything')
          this.sendAllSnapshots()
          this.sendAllHistory()
        } else {
          // we both have some documents, so we'll each advertise everything we have
          this.log('advertising everything')
          await this.advertiseAll()
        }
        break
      }

      case message.SEND_CHANGES: {
        // they are sending us changes that they figure we don't have
        const { documentId, changes, clock } = msg
        this.updateClock(documentId, theirs, Map(clock))

        // does this message contain new changes?
        const shouldUpdate = isMoreRecent(clock, this.getOurClock(documentId))
        // if so apply their changes
        if (shouldUpdate) await this.repo.applyChanges(documentId, changes)
        break
      }

      case message.ADVERTISE_DOCS: {
        // they are letting us know they have this specific version of each of these docs
        const { documents } = msg
        for (const { documentId, clock } of documents) {
          this.updateClock(documentId, theirs, Map(clock))
          // we have the document as well; see if we have a more recent version than they do; if so
          // send them the changes they're missing
          if (this.repo.has(documentId)) await this.maybeSendChanges(documentId)
          // we don't have this document at all; ask for it
          else this.requestDoc(documentId)
        }
        break
      }

      case message.REQUEST_DOCS: {
        // they don't have this document and are asking for this document in its entirety
        const { documentIds } = msg
        for (const documentId of documentIds) {
          this.updateClock(documentId, theirs, EMPTY_CLOCK)
          // send them what we have
          await this.maybeSendChanges(documentId)
        }
        break
      }

      case message.SEND_ALL_HISTORY: {
        // they are sending us the complete history of all documents
        const { history } = msg
        await this.receiveAllHistory(history)
        break
      }

      case message.SEND_ALL_SNAPSHOTS: {
        // they are sending us the latest snapshots for all documents
        const { state } = msg
        this.receiveAllSnapshots(state)
        break
      }

      default: {
        throw new Error(`Unknown message type: ${msg.type}`)
      }
    }
  }

  // Private methods

  /**
   * Called for each document upon initialization. Records the document's clock and advertises it.
   * @param documentId
   */
  private async registerDoc(documentId: string) {
    this.log('registerDoc', documentId)
    const clock = await this.getClockFromDoc(documentId)

    // Make sure we can sync this document
    this.validateDoc(documentId, clock)

    // Record the doc's initial clock
    await this.updateClock(documentId, ours, Map(clock))
  }

  /**
   * Checks the local doc's clock to ensure that it can be synced
   * @param documentId
   * @param clock
   */
  private validateDoc(documentId: string, clock: PlainClock) {
    this.log('validateDoc', documentId)

    // Make sure doc has a clock (i.e. is an Automerge object)
    if (!clock) throw new TypeError(ERR_NOCLOCK)

    // Make sure the document is newer than what we already have
    const ourClock = this.getOurClock(documentId)
    if (isMoreRecent(ourClock, clock)) throw new RangeError(ERR_OLDCLOCK)
  }

  /**
   * Event listener that fires when any document is modified on the repo
   * @param documentId
   */
  private async onDocChanged(documentId: string) {
    this.log('onDocChanged', documentId)
    const clock = await this.getClockFromDoc(documentId)
    if (clock === undefined) return

    // make sure we can sync the new document
    this.validateDoc(documentId, clock)

    // send the document if peer doesn't have it or has an older version
    await this.maybeSendChanges(documentId)

    // see if peer has a newer version
    await this.maybeRequestChanges(documentId, clock)

    // update our clock
    this.updateClock(documentId, ours, Map(clock))
  }

  /**
   * Sends a hello message including our document count
   */
  private async sendHello() {
    const documentCount = this.repo.count
    this.log('sending hello', documentCount)
    this.send({ type: message.HELLO, documentCount })
  }

  /**
   * Checks whether peer has more recent information than we do; if so, requests changes
   * @param documentId
   * @param theirClock
   */
  private async maybeRequestChanges(
    documentId: string,
    theirClock: PlainClock | Promise<PlainClock> = this.getClockFromDoc(documentId)
  ) {
    this.log('maybeRequestChanges', documentId)
    const ourClock = this.getOurClock(documentId) as PlainClock
    theirClock = await theirClock
    if (isMoreRecent(theirClock, ourClock)) this.advertise(documentId, theirClock)
  }

  /**
   * Checks whether we have more recent information than they do; if so, sends changes
   * @param documentId
   */
  private async maybeSendChanges(documentId: string) {
    const theirClock = this.getTheirClock(documentId)
    if (theirClock === undefined) return
    const ourDoc = await this.repo.get(documentId)
    if (ourDoc === undefined) return
    const _theirClock: A.Clock = (Map(theirClock) as unknown) as A.Clock
    const changes = _A.getMissingChanges(ourDoc, _theirClock)
    if (changes.length > 0) await this.sendChanges(documentId, changes)
  }

  /**
   * Sends a changeset to our peer, bringing them up to date with our latest info
   * @param documentId
   * @param changes
   */
  private async sendChanges(documentId: string, changes: A.Change[]) {
    this.log('sendChanges', documentId)
    const clock = await this.getClockFromDoc(documentId)
    this.send({
      type: message.SEND_CHANGES,
      documentId,
      clock,
      changes,
    })
    this.updateClock(documentId, ours)
  }

  /**
   * Informs our peer that we have a specific version of a document, so they can see if they have an
   * older version (in which case they will request changes) or a newer version (in which case they
   * will send changes)
   * @param documentId
   * @param [_clock]
   */
  private async advertise(documentId: string, clock: PlainClock = this.getOurClock(documentId)) {
    this.log('advertise', documentId)
    this.send({ type: message.ADVERTISE_DOCS, documents: [{ documentId, clock }] })
  }

  /**
   * Sends a single message containing each documentId along with our clock value for it
   */
  private async advertiseAll() {
    this.log('advertiseAll')
    // recast our ClockMap from an immutable-js Map to an array of {docId, clock} objects
    const documents: { documentId: string; clock: PlainClock }[] = []
    for (const [documentId, clock] of this.clock.ours.entries())
      documents.push({
        documentId,
        clock: clock.toJS() as PlainClock,
      })
    this.send({ type: message.ADVERTISE_DOCS, documents })
  }

  /**
   * Requests a document that we don't have, indicating that we need its entire history
   * @param documentId
   */
  private requestDoc(documentId: string) {
    this.send({ type: message.REQUEST_DOCS, documentIds: [documentId] })
  }

  /**
   * Send snapshots for all documents
   */
  private sendAllSnapshots() {
    const state = this.repo.getState()
    this.log('sendAllSnapshots', state)
    this.send({
      type: message.SEND_ALL_SNAPSHOTS,
      state,
    })
  }

  /**
   * Send all changes for all documents (for initialization)
   */
  private async sendAllHistory() {
    // TODO: for large datasets, send in batches
    const history = await this.repo.getHistory()
    this.log('sendAllHistory', history)
    this.send({ type: message.SEND_ALL_HISTORY, history })
  }

  /**
   * Load a history of all changes sent by peer
   * @param history
   */
  private async receiveAllHistory(history: RepoHistory) {
    this.log('receiveAllHistory', history)
    await this.repo.loadHistory(history)
  }

  /**
   * Load a snapshot of the entire repo
   * @param state
   */
  private receiveAllSnapshots(state: RepoSnapshot) {
    this.log('receiveAllSnapshots', state)
    this.repo.loadState(state)
  }

  /** Looks up our last recorded clock for the requested document */
  getOurClock = (documentId: string) =>
    this.clock.ours.get(documentId, EMPTY_CLOCK).toJS() as PlainClock

  getTheirClock = (documentId: string) => {
    const theirClock = this.clock.theirs.get(documentId)
    return theirClock ? (theirClock.toJS() as PlainClock) : undefined
  }

  /**
   * Pulls clock information from the document's metadata
   * @param documentId
   * @returns clock from doc
   */
  private async getClockFromDoc(documentId: string): Promise<PlainClock> {
    const doc = await this.repo.get(documentId)
    if (doc === undefined) return EMPTY_CLOCK_PLAIN
    return Map(_A.getClock(doc!)).toJS() as PlainClock
  }

  /**
   * Updates the vector clock by merging in the new vector clock `clock`, setting each node's
   * sequence number to the maximum for that node
   * @param documentId
   * @param which
   * @param clock
   */
  private async updateClock(documentId: string, which: Which, clock?: Clock) {
    const _clock = clock ? (clock.toJS() as PlainClock) : await this.getClockFromDoc(documentId)

    const clockMap = this.clock[which]
    const oldClock = clockMap.get(documentId, EMPTY_CLOCK).toJS() as PlainClock

    // Merge the clocks, keeping the maximum sequence number for each node
    const newClock = mergeClocks(oldClock, _clock)
    this.clock[which] = clockMap.set(documentId, Map(newClock))
  }
}

const ERR_OLDCLOCK = `Cannot pass an old state object to a connection`
const ERR_NOCLOCK = `This object doesn't have a clock and cannot be used for network sync. `

const ours = 'ours'
const theirs = 'theirs'
type Which = typeof ours | typeof theirs

// TODO: Submit these to Automerge
const _A = {
  ...A,

  getMissingChanges: (ourDoc: A.Doc<any>, theirClock: A.Clock): A.Change[] => {
    if (theirClock === undefined) return []
    const ourState = A.Frontend.getBackendState(ourDoc)
    return A.Backend.getMissingChanges(ourState!, theirClock)
  },

  getClock: (doc: A.Doc<any>): A.Clock => {
    const state = A.Frontend.getBackendState(doc) as any // BackendState doesn't have a public API
    return state.getIn(['opSet', 'clock']) as A.Clock
  },
}
