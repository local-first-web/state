import WebSocket from 'ws'

export type ConnectRequestParams = {
  peerA: WebSocket
  A: string
  B: string
  key: string
}

export type KeySet = string[]

export namespace Message {
  export type ClientToServer = Join

  export interface Join {
    type: 'Join' | 'Leave'
    join?: string[]
    leave?: string[]
  }

  export type ServerToClient = Introduction

  export interface Introduction {
    type: 'Introduction'
    id: string
    keys: string[]
  }
}
