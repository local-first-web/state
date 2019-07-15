export interface Info {
  channel: Buffer
  discoveryKey: Buffer
  live?: boolean
  download?: boolean
  upload?: boolean
  encrypt?: boolean
  hash?: boolean
}
