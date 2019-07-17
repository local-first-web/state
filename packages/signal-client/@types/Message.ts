export namespace Message {
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

  export interface Connect {
    type: 'Connect'
    id: string
    keys: string[]
  }

  export type ClientToServer = Hello | Join | Leave
  export type ServerToClient = Connect
}
