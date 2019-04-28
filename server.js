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

      const payload = { time: Date.now(), ...data }

      db.set('last', payload)
      db.get('traces').push(payload)
      db.write()
    } catch (err) {
      console.log('[GPS-TRACK] Error', err)
    }
  })
})
