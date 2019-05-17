const https = require('https')
const fs = require('fs')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const WebSocket = require('ws')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ traces: [], start: null, last: {} }).write()

const port = 4040

const server = https.createServer({
  cert: fs.readFileSync('/etc/letsencrypt/live/balthazargronon.com/cert.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/balthazargronon.com/privkey.pem'),
})

const wss = new WebSocket.Server({ server })

server.listen(port)

console.log(`[GPS-TRACK] started on :${port}`)

wss.broadcast = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

const getInitData = () => {
  const traces = db.get('traces').value()
  const start = db.get('start').value()
  const last = db.get('last').value()
  const lastTraces = traces.filter(t => t.time > start)

  return JSON.stringify({ type: 'viewerData', traces: lastTraces, last })
}

wss.on('connection', socket => {
  socket.on('message', message => {
    try {
      const { type, ...data } = JSON.parse(message)

      if (type === 'viewer') {
        return socket.send(getInitData())
      }

      if (type === 'auth') {
        if (data.code === process.env.ACCESS_KEY) {
          socket.isAuthenticated = true
          db.set('start', Date.now()).write()
          console.log('[Master login] Success.')

          wss.broadcast(getInitData())
        } else {
          console.log('[Master login] Failed.')
        }

        return
      }

      if (!socket.isAuthenticated) {
        return
      }

      db.set('last', data).value()
      db
        .get('traces')
        .push(data)
        .value()
      db.write()

      wss.broadcast(JSON.stringify({ type: 'last', ...data }))
    } catch (err) {
      console.log('[GPS-TRACK] Error', err)
    }
  })
})
