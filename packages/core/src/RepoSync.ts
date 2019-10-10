import A from 'automerge'
import debug from 'debug'
import { Map } from 'immutable'
import { Repo } from './Repo'
import { lessOrEqual } from './lib/lessOrEqual'
import {
  Message,
  SEND_CHANGES,
  REQUEST_DOC,
  REQUEST_ALL,
  ADVERTISE_DOC,
  SEND_ALL_HISTORY,
  SEND_ALL_SNAPSHOTS,
  HELLO,
} from './Message'
import { RepoHistory, RepoSnapshot } from './types'

type Clock = Map<string, number>
type ClockMap = Map<string, Clock>
type Clocks = { ours: ClockMap; theirs: ClockMap }

const EMPTY_CLOCK: Clock = Map()
const EMPTY_CLOCKMAP: ClockMap = Map()

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
  private clock: Clocks
  private log: debug.Debugger

  /**
   * @param repo A `Repo` containing the document being synchronized.
   * @param send Callback function, called when the local document changes. Provided by the
   * networking stack. Should send the given message to the remote peer.
   */
  constructor(repo: Repo<any>, send: (msg: Message) => void) {
    this.repo = repo
    this.send = send
    this.clock = { ours: EMPTY_CLOCKMAP, theirs: EMPTY_CLOCKMAP }
    this.log = debug(`cevitxe:reposync:${repo.databaseName}`)
  }

  // Public API

  async open() {
    if (this.repo.documentIds.length === 0) {
      await this.requestAll()
    } else {
      for (let documentId of this.repo.documentIds) await this.registerDoc(documentId)
    }
    this.repo.addHandler(this.onDocChanged.bind(this))
  }

  close() {
    this.log('close')
    this.repo.removeHandler(this.onDocChanged.bind(this))
  }

  /**
   * Called by the network stack whenever it receives a message from a peer
   * @param msg
   */
  async receive(msg: Message) {
    this.log('receive', msg)
    switch (msg.type) {
      case HELLO: {
        const { documentCount } = msg

        break
      }
      case SEND_CHANGES: {
        // they are sending us changes that they figure we don't have
        const { documentId, changes, clock } = msg
        this.updateClock(documentId, theirs, clock)
        // apply their changes
        await this.repo.applyChanges(documentId, changes)
        break
      }
      case ADVERTISE_DOC: {
        // they are letting us know they have this specific version of this doc
        const { documentId, clock } = msg
        this.updateClock(documentId, theirs, clock)
        // we have the document as well; see if we have a more recent version than they do; if so
        // send them the changes they're missing
        if (this.repo.has(documentId)) await this.maybeSendChanges(documentId)
        // we don't have this document at all; ask for it
        else this.requestDoc(documentId)
        break
      }
      case REQUEST_DOC: {
        // they don't have this document and are asking for this document in its entirety
        const { documentId } = msg
        this.updateClock(documentId, theirs, EMPTY_CLOCK)
        // send them what we have
        await this.maybeSendChanges(documentId)
        break
      }
      case REQUEST_ALL: {
        // they are starting from zero & asking for everything we have
        // only send if we have something
        if (this.repo.documentIds.length > 0) {
          this.sendAllSnapshots()
          await this.sendAllHistory()
        } else {
          this.log('nothing to send')
        }
        break
      }
      case SEND_ALL_HISTORY: {
        // they are sending us the complete history of all documents
        const { history } = msg
        await this.receiveAllHistory(history)
        break
      }
      case SEND_ALL_SNAPSHOTS: {
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

    // Let peer know we have the document
    await this.advertise(documentId, clock)

    // Record the doc's initial clock
    await this.updateClock(documentId, ours, clock)
  }

  /**
   * Checks the local doc's clock to ensure that it can be synced
   * @param documentId
   * @param clock
   */
  private validateDoc(documentId: string, clock: Clock) {
    this.log('validateDoc', documentId)

    // Make sure doc has a clock (i.e. is an Automerge object)
    if (!clock) throw new TypeError(ERR_NOCLOCK)

    // Make sure the document is newer than what we already have
    const ourClock = this.getClock(documentId, ours)
    if (!lessOrEqual(ourClock, clock)) {
      throw new RangeError(ERR_OLDCLOCK)
    }
  }

  /**
   * Event listener that fires when any document is modified on the repo
   * @param documentId
   */
  private async onDocChanged(documentId: string) {
    this.log('onDocChanged', documentId)
    const clock = await this.getClockFromDoc(documentId)

    // make sure we can sync the new document
    this.validateDoc(documentId, clock)

    // send the document if peer doesn't have it or has an older version
    await this.maybeSendChanges(documentId)

    // see if peer has a newer version
    await this.maybeRequestChanges(documentId, clock)

    // update our clock
    this.updateClock(documentId, ours, clock)
  }

  /**
   * Checks whether peer has more recent information than we do; if so, requests changes
   * @param documentId
   * @param theirClock
   */
  private async maybeRequestChanges(
    documentId: string,
    theirClock: Clock | Promise<Clock> = this.getClockFromDoc(documentId)
  ) {
    this.log('maybeRequestChanges', documentId)
    const ourClock = this.getClock(documentId, ours)
    if (!lessOrEqual(await theirClock, ourClock)) this.advertise(documentId, theirClock)
  }

  /**
   * Checks whether we have more recent information than they do; if so, sends changes
   * @param documentId
   */
  private async maybeSendChanges(documentId: string) {
    this.log('maybeSendChanges', documentId)
    const theirClock = (this.getClock(documentId, theirs) as unknown) as A.Clock
    if (theirClock === undefined) return

    const ourState = await this.getBackendState(documentId)
    const changes = A.Backend.getMissingChanges(ourState!, theirClock)
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
      type: SEND_CHANGES,
      documentId,
      clock: clock.toJS() as any,
      changes,
    })
    this.updateClock(documentId, ours)
  }

  /**
   * Informs a peer that we a specific version of a document, so they can see if they have an older
   * version (in which case they will request changes) or a newer version (in which case they will
   * send changes)
   * @param documentId
   * @param [clock]
   */
  private async advertise(
    documentId: string,
    clock: Clock | Promise<Clock> = this.getClockFromDoc(documentId)
  ) {
    this.log('advertise', documentId)
    this.send({
      type: ADVERTISE_DOC,
      documentId,
      clock: (await clock).toJS() as any,
    })
  }

  /**
   * Requests a document that we don't have, indicating that we need its entire history
   * @param documentId
   */
  private requestDoc(documentId: string) {
    this.send({ type: REQUEST_DOC, documentId })
  }

  /**
   * Initializing repo from the network, request everything peer has (snapshots and changes)
   */
  private async requestAll() {
    this.log('requestAll')
    this.send({ type: REQUEST_ALL })
  }

  /**
   * Send snapshots for all documents
   */
  private sendAllSnapshots() {
    const state = this.repo.getState()
    this.log('sendAllSnapshots', state)
    this.send({
      type: SEND_ALL_SNAPSHOTS,
      state,
    })
  }

  /**
   * Send all changes for all documents (for initialization)
   */
  private async sendAllHistory() {
    const history = await this.repo.getHistory()
    this.log('sendAllHistory', history)
    this.send({
      type: SEND_ALL_HISTORY,
      history,
    })
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

  /**
   * Looks up our last recorded clock for the requested document
   * @param documentId
   * @param which
   * @returns clock
   */
  getClock(documentId: string, which: 'ours'): Clock
  getClock(documentId: string, which: 'theirs'): Clock | undefined
  getClock(documentId: string, which: keyof Clocks): Clock | undefined {
    const initialClockValue =
      which === ours
        ? EMPTY_CLOCK // our default clock value is an empty clock
        : undefined // their default clock value is undefined
    return this.clock[which].get(documentId, initialClockValue)
  }

  /**
   * Pulls clock information from the document's metadata
   * @param documentId
   * @returns clock from doc
   */
  private async getClockFromDoc(documentId: string): Promise<Clock> {
    if (!this.repo.has(documentId)) return EMPTY_CLOCK
    const state = (await this.getBackendState(documentId)) as any
    return state.getIn(['opSet', 'clock'])
  }

  /**
   * Updates the vector clock by merging in the new vector clock `clock`, setting each node's
   * sequence number to the maximum for that node
   * @param documentId
   * @param which
   * @param [clock]
   */
  private async updateClock(documentId: string, which: keyof Clocks, clock?: Clock) {
    if (clock === undefined) clock = await this.getClockFromDoc(documentId)
    const clockMap = this.clock[which]
    const oldClock = clockMap.get(documentId, EMPTY_CLOCK)
    // Merge the clocks, keeping the maximum sequence number for each node
    const largestWins = (x: number = 0, y: number = 0): number => Math.max(x, y)
    const newClock = oldClock.mergeWith(largestWins, clock!)
    this.clock[which] = clockMap.set(documentId, newClock)
  }

  /**
   * Returns the Automerge state for the specified document
   * @param documentId
   * @returns
   */
  private async getBackendState(documentId: string) {
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
