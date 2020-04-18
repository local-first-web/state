import WebSocket from 'ws'
export const pipeSockets = (socket1: WebSocket, socket2: WebSocket) => {
  const pipeOneWay = (A: WebSocket, B: WebSocket) => {
    const cleanup = () => {
      A.close()
      B.close()
    }
    A.on('message', data => {
      const ready = B.readyState === WebSocket.OPEN
      if (ready) B.send(data)
      else A.close()
    })
    A.on('error', cleanup)
    A.on('close', cleanup)
  }
  pipeOneWay(socket1, socket2)
  pipeOneWay(socket2, socket1)
}
