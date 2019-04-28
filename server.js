const WebSocket = require('ws')

const port = 4040
const wss = new WebSocket.Server({ port })

console.log(`[GPS-TRACK] Started on :${port}`)

wss.on('connection', socket => {
  socket.on('message', message => {
    console.log('received:', message)
  })
})
