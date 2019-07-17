import { Duplex } from 'stream'
import { HypercoreOptions } from './Info'

export interface PeerOptions {
  id: string
  url: string
  // stream: (info: HypercoreOptions) => Duplex
}
