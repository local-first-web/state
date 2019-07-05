import { Instance as Peer } from 'simple-peer'
import debug from 'debug'

const log = debug('cevitxe:mock:signalhub')

let peers: Peer[] = []
export default (documentId: string, peerHubs: any[]) => {
  return {
    peers,
  }
}

export const cleanup = () => {
  log(`cleaning up ${peers.length} peers`)
  peers.forEach(p => p.destroy())
  peers = []
}
