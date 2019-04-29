const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const WebSocket = require('ws')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ traces: [], last: {} }).write()

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

      db.set('last', data).value()
      db.get('traces')
        .push(data)
        .value()
      db.write()
    } catch (err) {
      console.log('[GPS-TRACK] Error', err)
    }
  })
})
