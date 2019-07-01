import Peer from 'simple-peer'
import uuid = require('uuid')
import debug from 'debug'
const wrtc = require('wrtc')

const log = debug('cevitxe:mock:webrtc-swarm')

export default (hub: any) => ({
  on: (event: string, cb: Function) => {
    switch (event) {
      case 'peer':
        const initiator = hub.peers.length > 0
        const peer = new Peer({ wrtc, initiator })
        const id = uuid()
        //@ts-ignore
        log('swarm peer', peer._id, initiator)
        hub.peers.forEach((remotePeer: Peer.Instance) => {
          peer.on('signal', (data: any) => {
            //@ts-ignore
            log(`l:${peer._id} signaled r:${remotePeer._id}`)
            remotePeer.signal(data)
          })
          remotePeer.on('signal', (data: any) => {
            //@ts-ignore
            log(`r:${remotePeer._id} signaled l:${peer._id}`)
            peer.signal(data)
          })
        })

        hub.peers.push(peer)
        peer.on('connect', () => {
          //@ts-ignore
          log('swarm peer connect', peer._id)
          cb(peer, id)
        })
        break

      default:
        break
    }
  },
})
