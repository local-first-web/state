import { Connection } from './connection'
import { automergify } from './automergify';

interface FooState {
  foo: string
  boo?: string
}

describe('Connection', () => {
  const defaultState: FooState = automergify({ foo: 'hello world' })

  let connection: Connection

  beforeEach(() => {
    connection = new Connection(defaultState)
  })

  it('should expose its current state', () => {
    expect(connection.state).toEqual(defaultState)
  })

  it('should apply changes to documents', () => {})
})
