const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const WebSocket = require('ws')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ traces: [], start: null, last: {} }).write()

const port = 4040
const wss = new WebSocket.Server({ port })

console.log(`[GPS-TRACK] started on :${port}`)

wss.broadcast = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

wss.on('connection', socket => {
  socket.on('message', message => {
    try {
      const { type, ...data } = JSON.parse(message)

      if (type === 'viewer') {
        const traces = db.get('traces').value()
        const start = db.get('start').value()
        const last = db.get('last').value()
        const lastTraces = traces.filter(t => t.time > start)
        socket.send(JSON.stringify({ type: 'viewerData', traces: lastTraces, last }))
        return
      }

      if (type === 'auth') {
        if (data.code === process.env.ACCESS_KEY) {
          socket.isAuthenticated = true
          db.set('start', Date.now()).write()
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

      wss.broadcast(JSON.stringify({ type: 'last', ...data }))
    } catch (err) {
      console.log('[GPS-TRACK] Error', err)
    }
  })
})
