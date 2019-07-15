import { Server } from './Server'
import { Server as MockServer } from 'mock-socket'
import WebSocket from 'ws'

jest.mock('express-ws')

// const DOC1 = 'test-123'
// const DOC2 = 'test-qrs'
// const fakeURL = 'ws://localhost:1234'

// describe('Server', () => {
//   it('should open & close', done => {
//     // const mockServer = new MockServer(fakeURL)
//     const server = new Server()

//     const localPeer = new WebSocket(fakeURL)
//     server.openDiscoveryConnection(localPeer, DOC1)
//     expect(server.peers).toHaveProperty(DOC1)

//     // localPeer.close()
//     // expect(server.peers).not.toHaveProperty(DOC1)
//     done()
//     // localPeer.on('close', () => {})
//   })
// })

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

describe('Mock WebSocket server', () => {
  it('should allow testing the chat app', async done => {
    const fakeURL = 'ws://localhost:8080'
    const mockServer = new MockServer(fakeURL)

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
      mockServer.close()
      done()
    }, 100)
  })
})
