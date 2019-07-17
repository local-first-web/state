import { Duplex } from 'stream'
import { HypercoreOptions } from './Info'

export interface ClientOptions {
  id: string
  url: string
  stream: (info: HypercoreOptions) => Duplex
}
