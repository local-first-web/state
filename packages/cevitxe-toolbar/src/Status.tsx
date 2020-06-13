/** @jsx jsx */
import { jsx } from '@emotion/core'
import { StoreManager } from 'cevitxe'
import { Component, Fragment } from 'react'
import { StatusLight } from './StatusLight'
import { styles } from './Toolbar'
import { ConnectionEvent } from 'cevitxe-types'

const { OPEN, CLOSE, PEER, PEER_REMOVE } = ConnectionEvent

interface StatusProps<T> {
  storeManager: StoreManager<T>
}

interface StatusState {
  peers?: String[]
}

export class Status extends Component<StatusProps<any>, StatusState> {
  constructor(props: StatusProps<any>) {
    super(props)
    this.state = { peers: undefined }
    this.peerHandler = this.peerHandler.bind(this)
    this.openHandler = this.openHandler.bind(this)
    this.closeHandler = this.closeHandler.bind(this)
  }

  peerHandler(peers: String[]) {
    this.setState({ peers })
  }

  openHandler() {
    this.setState({ peers: [] })
  }

  closeHandler() {
    this.setState({ peers: undefined })
  }

  componentDidMount() {
    const m = this.props.storeManager
    m.on(OPEN, this.openHandler)
    m.on(CLOSE, this.closeHandler)
    m.on(PEER, this.peerHandler)
    m.on(PEER_REMOVE, this.peerHandler)
  }

  componentWillUnmount() {
    const m = this.props.storeManager
    m.off(OPEN, this.openHandler)
    m.off(CLOSE, this.closeHandler)
    m.off(PEER, this.peerHandler)
    m.off(PEER_REMOVE, this.peerHandler)
  }

  render() {
    const { peers } = this.state
    return (
      <div
        css={styles.toolbarGroup}
        title={
          !peers
            ? 'offline'
            : `online; ${peers.length} other ${
                peers.length === 1 ? 'peer is' : 'peers are'
              } connected`
        }
      >
        <label>
          <StatusLight connected={!!peers} />
          {peers && <Fragment>{peers.length}</Fragment>}
        </label>
      </div>
    )
  }
}
