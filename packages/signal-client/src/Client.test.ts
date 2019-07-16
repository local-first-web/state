import WebSocket from 'ws'
import { debug } from 'debug-deluxe'
import { Client } from './Client'
import { Duplex } from 'stream'
import { Server } from 'cevitxe-signal-server'

const kill = require('kill-port')
const port = 1234
const url = `ws://localhost:${port}`

describe('Client', () => {
  const log = debug('cevitxe:signal-client:tests')
  const _log = console.log

  let server: Server
  let key: string
  let testId: number = 0

  beforeAll(async () => {
    // prevent server from logging 'listening on port...' during tests
    console.log = () => {}

    await kill(port, 'tcp') // kill anything that's still listening on our port (e.g. previous test run didn't end cleanly)
    server = new Server({ port })
    await server.listen()
  })

  beforeEach(() => {
    testId += 1
    // localId = `local-${testId}`
    // remoteId = `remote-${testId}`
    key = `test-key-${testId}`
    log(`TEST ${testId}`)
  })

  afterEach(() => {})

  afterAll(() => {
    server.close()
    console.log = _log
  })

  it('should base58 encode the id', () => {
    const id = Buffer.from('12345')
    const stream = () => new Duplex()
    const client = new Client({ id, url, stream })
    expect(client.id).toEqual('6YvUFcg')
  })
})
