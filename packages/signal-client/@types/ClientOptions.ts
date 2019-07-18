import { Duplex } from 'stream'

export interface ClientOptions {
  id: string
  url: string
  // stream: () => Duplex
}
