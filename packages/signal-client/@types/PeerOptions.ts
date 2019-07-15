import { Duplex } from 'stream'
import { Info } from './Info'
export interface PeerOptions {
  id: string
  url: string
  stream: (info: Info) => Duplex
}
