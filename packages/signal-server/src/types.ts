import WebSocket from 'ws'

export type ConnectRequestParams = {
  peerA: WebSocket
  A: string
  B: string
  key: string
}

export type KeySet = string[]

export namespace Message {
  export type ClientToServer = Hello | Join | Leave

  export interface Hello {
    type: 'Hello'
    id: string
    join: string[]
  }

  export interface Join {
    type: 'Join'
    id: string
    join: string[]
  }

  export interface Leave {
    type: 'Leave'
    id: string
    leave: string[]
  }

  export type ServerToClient = Introduction

  export interface Introduction {
    type: 'Introduction'
    id: string
    keys: string[]
  }
}
