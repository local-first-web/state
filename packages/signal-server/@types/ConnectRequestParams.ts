import WebSocket from 'ws'
export type ConnectRequestParams = {
  peerA: WebSocket
  A: string
  B: string
  key: string
}
