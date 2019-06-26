import { Instance as Peer } from 'simple-peer'

let peers: Peer[] = []
export default (discoveryKey: string, peerHubs: any[]) => {
  return {
    peers,
  }
}

export const cleanup = () => {
  console.log(`cleaning up ${peers.length} peers`)
  peers.forEach(p => p.destroy())
  peers = []
}
