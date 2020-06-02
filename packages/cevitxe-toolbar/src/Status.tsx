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
    this.eventHandler = this.eventHandler.bind(this)
  }

  eventHandler(peers: String[]) {
    this.setState({peers})
  }
  componentDidMount() {
    const m = this.props.storeManager
    m.on('peer_added', this.eventHandler)
    m.on('peer_removed', this.eventHandler)
  }
  componentWillUnmount() {
    const m = this.props.storeManager
    m.off('peer_added', this.eventHandler)
    m.off('peer_removed', this.eventHandler)
  }

  render() {
    const { peers } = this.state
    if (peers) {
      return <p>Connected to {peers.length} other user(s)</p>
    } else {
      return <p>Not connected to internet ring.</p>
    }
  }
}
