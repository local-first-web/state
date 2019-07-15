import { Server } from './Server'

const DEFAULT_PORT = 8080

const server = new Server({ port: Number(process.env.PORT || DEFAULT_PORT) })
server.listen()
