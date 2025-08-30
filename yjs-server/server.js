import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils.js';
import http from 'http';


const port = 6000
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Yjs WebSocket server\n')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req)
})

server.listen(port, () => {
  console.log(`Yjs WebSocket server running on port ${port}`)
})
