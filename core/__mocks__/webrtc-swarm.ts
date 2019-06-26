import Peer from 'simple-peer'
import uuid = require('uuid')
const wrtc = require('wrtc')

export default (hub: any) => ({
  on: (event: string, cb: Function) => {
    switch (event) {
      case 'peer':
        const initiator = hub.peers.length === 0
        const peer = new Peer({ wrtc, initiator })
        const id = uuid()

        hub.peers.forEach((remotePeer: Peer.Instance) => {
          peer.on('signal', (data: any) => remotePeer.signal(data))
          remotePeer.on('signal', (data: any) => peer.signal(data))
        })

        hub.peers.push(peer)
        cb(peer, id)
        break

      default:
        break
    }
  },
})
