import { Duplex } from 'stream'
import { Info } from './Info'

export interface ClientOptions {
  id: Buffer
  url: string
  stream: (info: Info) => Duplex
}
