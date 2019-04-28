const WebSocket = require('ws')

const port = 4040
const wss = new WebSocket.Server({ port })

console.log(`[GPS-TRACK] Started on :${port}`)

wss.on('connection', socket => {
  socket.on('message', message => {
    try {
      const { type, ...data } = JSON.parse(message)

      if (type === 'auth') {
        if (data.code === process.env.ACCESS_KEY) {
          socket.isAuthenticated = true
        }

        return
      }

      if (!socket.isAuthenticated) {
        return
      }

      console.log(data)
    } catch (err) {
      console.log('[GPS-TRACK] Error', err)
    }
  })
})
