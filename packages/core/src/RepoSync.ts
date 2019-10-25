import A from 'automerge'
import debug from 'debug'
import { Map } from 'immutable'
import { EMPTY_CLOCK, isMoreRecent, mergeClocks, getMissingChanges, getClock } from './clocks'
import * as message from './Message'
import { Message } from './Message'
import { Repo } from './Repo'
import { Clock, ClockMap, RepoHistory, RepoSnapshot } from './types'

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
  private theirClock: ClockMap
  private isOpen = false
  private log: debug.Debugger

  /**
   * @param repo A `Repo` containing the document being synchronized.
   * @param send Callback function, called when the local document changes. Provided by the
   * networking stack. Should send the given message to the remote peer.
   */
  constructor(repo: Repo<any>, send: (msg: Message) => void) {
    this.repo = repo
    this.send = send
    this.theirClock = {}
    this.log = debug(`cevitxe:reposync:${repo.databaseName}`)
  }

  // PUBLIC METHODS

  async open() {
    this.log('open')

    this.isOpen = true
    for (let documentId of this.repo.documentIds)
      if (!this.repo.hasClock(documentId)) await this.registerDoc(documentId)

    this.repo.addHandler(this.onDocChanged.bind(this))
    await this.sendHello()
  }

  close() {
    this.log('close')
    this.isOpen = false
    this.repo.removeHandler(this.onDocChanged.bind(this))
  }

  /** Called by the network stack whenever it receives a message from a peer */
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
        this.updateTheirClock(documentId, clock)

        // does this message contain new changes?
        const shouldUpdate = isMoreRecent(clock, this.getOurClock(documentId))
        // if so apply their changes
        if (shouldUpdate) await this.repo.applyChanges(documentId, changes)
        break
      }

      case message.ADVERTISE_DOCS: {
        // they are letting us know they have this specific version of each of these docs
        const { clocks } = msg
        for (const { documentId, clock } of clocks) {
          this.updateTheirClock(documentId, clock)
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
          this.updateTheirClock(documentId, EMPTY_CLOCK)
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

  // PRIVATE METHODS

  /** Called for each document upon initialization. Records the document's clock and advertises it. */
  private async registerDoc(documentId: string) {
    this.log('registerDoc', documentId)
    const clock = await this.getClockFromDoc(documentId)

    // Make sure we can sync this document
    this.validateDoc(documentId, clock)

    // Record the doc's initial clock
    await this.updateOurClock(documentId, clock)
  }

  /** Checks the local doc's clock to ensure that it can be synced */
  private validateDoc(documentId: string, clock: Clock) {
    this.log('validateDoc', documentId)

    // Make sure doc has a clock (i.e. is an Automerge object)
    if (!clock) throw new TypeError(ERR_NOCLOCK)

    // Make sure the document is newer than what we already have
    const ourClock = this.getOurClock(documentId)
    if (isMoreRecent(ourClock, clock)) throw new RangeError(ERR_OLDCLOCK)
  }

  /** Event listener that fires when any document is modified on the repo */
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
    this.updateOurClock(documentId, clock)
  }

  /** Sends a hello message including our document count */
  private async sendHello() {
    const documentCount = this.repo.count
    this.log('sending hello', documentCount)
    this.send({ type: message.HELLO, documentCount })
  }

  /** Checks whether peer has more recent information than we do; if so, requests changes */
  private async maybeRequestChanges(
    documentId: string,
    theirClock: Clock | Promise<Clock> = this.getClockFromDoc(documentId)
  ) {
    this.log('maybeRequestChanges', documentId)
    const ourClock = this.getOurClock(documentId) as Clock
    theirClock = await theirClock
    if (isMoreRecent(theirClock, ourClock)) this.advertise(documentId, theirClock)
  }

  /** Checks whether we have more recent information than they do; if so, sends changes */
  private async maybeSendChanges(documentId: string) {
    const theirClock = this.getTheirClock(documentId)
    if (theirClock === undefined) return
    const ourDoc = await this.repo.get(documentId)
    if (ourDoc === undefined) return
    const _theirClock: A.Clock = (Map(theirClock) as unknown) as A.Clock
    const changes = getMissingChanges(ourDoc, _theirClock)
    if (changes.length > 0) await this.sendChanges(documentId, changes)
  }

  /** Sends a changeset to our peer, bringing them up to date with our latest info */
  private async sendChanges(documentId: string, changes: A.Change[]) {
    this.log('sendChanges', documentId)
    const clock = await this.getClockFromDoc(documentId)
    this.send({ type: message.SEND_CHANGES, documentId, clock, changes })
    this.updateOurClock(documentId, clock)
  }

  /** Informs our peer that we have a specific version of a document, so they can see if they have an * older version (in which case they will request changes) or a newer version (in which case they
   * will send changes)
   */
  private async advertise(documentId: string, clock: Clock = this.getOurClock(documentId)) {
    this.log('advertise', documentId)
    this.send({ type: message.ADVERTISE_DOCS, clocks: [{ documentId, clock }] })
  }

  /** Sends a single message containing each documentId along with our clock value for it */
  private async advertiseAll() {
    this.log('advertiseAll')
    const clocks = this.repo.getAllClocks()
    this.send({ type: message.ADVERTISE_DOCS, clocks })
  }

  /** Requests a document that we don't have, indicating that we need its entire history */
  private requestDoc(documentId: string) {
    this.send({ type: message.REQUEST_DOCS, documentIds: [documentId] })
  }

  /** Send snapshots for all documents */
  private sendAllSnapshots() {
    const state = this.repo.getState()
    this.log('sendAllSnapshots', state)
    this.send({ type: message.SEND_ALL_SNAPSHOTS, state })
  }

  /** Send all changes for all documents (for initialization) */
  private async sendAllHistory() {
    // TODO: for large datasets, send in batches
    const history = await this.repo.getHistory()
    this.log('sendAllHistory', history)
    this.send({ type: message.SEND_ALL_HISTORY, history })
  }

  /** Load a history of all changes sent by peer */
  private async receiveAllHistory(history: RepoHistory) {
    this.log('receiveAllHistory', history)
    await this.repo.loadHistory(history)
  }

  /** Load a snapshot of the entire repo */
  private receiveAllSnapshots(state: RepoSnapshot) {
    this.log('receiveAllSnapshots', state)
    this.repo.loadState(state)
  }

  /** Pulls clock information from the document's metadata */
  private async getClockFromDoc(documentId: string): Promise<Clock> {
    const doc = await this.repo.get(documentId)
    if (doc === undefined) return EMPTY_CLOCK
    return Map(getClock(doc!)).toJS() as Clock
  }

  /** Looks up our last recorded clock for the requested document */
  getOurClock = (documentId: string) => this.repo.getClock(documentId)
  getTheirClock = (documentId: string) => this.theirClock[documentId]

  /** Updates our vector clock by merging in the new vector clock `clock`, setting each node's sequence number to the maximum for that node */
  private async updateOurClock(documentId: string, newClock: Clock) {
    this.repo.updateClock(documentId, newClock)
  }

  /** Updates their vector clock by merging in the new vector clock `clock`, setting each node's sequence number to the maximum for that node
   * @param documentId
   * @param newClock
   */
  private async updateTheirClock(documentId: string, newClock: Clock) {
    const oldClock = this.theirClock[documentId] || EMPTY_CLOCK
    this.theirClock[documentId] = mergeClocks(oldClock, newClock)
  }
}

const ERR_OLDCLOCK = `Cannot pass an old state object to a connection`
const ERR_NOCLOCK = `This object doesn't have a clock and cannot be used for network sync. `
