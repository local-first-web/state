import { WebSocket, Server as MockServer } from 'mock-socket'
const fakeURL = 'ws://localhost:1234'

let mockServer: MockServer

beforeEach(() => {
  mockServer = new MockServer(fakeURL)
  mockServer.start()
})

afterEach(() => {
  mockServer.stop()
})

class ChatApp {
  messages: string[]
  connection: WebSocket

  constructor(url: string) {
    this.messages = []
    this.connection = new WebSocket(url)

    this.connection.onmessage = (event: any) => {
      this.messages.push(event.data.toString())
    }
  }

  sendMessage(message: any) {
    this.connection.send(message)
  }
}

describe.skip('Mock WebSocket server', () => {
  it('should allow testing the chat app', async done => {
    mockServer.on('connection', (socket: any) => {
      socket.on('message', (data: string) => {
        expect(data).toEqual('test message from app')
        socket.send('test message from mock server')
      })
    })

    const app = new ChatApp(fakeURL)
    app.sendMessage('test message from app') // NOTE: this line creates a micro task

    // NOTE: this timeout is for creating another micro task that will happen after the above one
    setTimeout(() => {
      expect(app.messages.length).toBe(1)
      expect(app.messages[0]).toEqual('test message from mock server')
      done()
    }, 100)
  })
})
