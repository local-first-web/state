import WebSocket from 'ws'
import { ConnectionEvent } from 'cevitxe-types'

const { OPEN, CLOSE, ERROR, MESSAGE } = ConnectionEvent

export const pipeSockets = (socket1: WebSocket, socket2: WebSocket) => {
  const pipeOneWay = (A: WebSocket, B: WebSocket) => {
    const cleanup = () => {
      A.close()
      B.close()
    }
    A.on(MESSAGE, data => {
      const ready = B.readyState === WebSocket.OPEN
      if (ready) B.send(data)
      else A.close()
    })
    A.on(ERROR, cleanup)
    A.on(CLOSE, cleanup)
  }
  pipeOneWay(socket1, socket2)
  pipeOneWay(socket2, socket1)
}
