import React, { Component } from 'react'
import { StoreManager } from 'cevitxe'

interface StatusProps<T> {
  storeManager: StoreManager<T>;
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
    this.setState({peers})
  }
  openHandler() {
    this.setState({peers: []})
  }
  closeHandler() {
    this.setState({peers: undefined})
  }
  componentDidMount() {
    const m = this.props.storeManager
    m.on('open', this.openHandler)
    m.on('close', this.closeHandler)
    m.on('peer_add', this.peerHandler)
    m.on('peer_remove', this.peerHandler)
  }
  componentWillUnmount() {
    const m = this.props.storeManager
    m.off('open', this.openHandler)
    m.off('close', this.closeHandler)
    m.off('peer_add', this.peerHandler)
    m.off('peer_remove', this.peerHandler)
  }

  render() {
    const { peers } = this.state
    if (!peers) {
        return <p>Not connected to internet ring.</p>
    } else if (peers.length > 0) {
        return <p>Connected to {peers.length} other user(s)</p>
    } else {
        return <p>Connected but there are no other users</p>
    }
  }
}
