import http from 'http'
import https from 'https'
import fs from 'fs'

import WebSocket from 'ws'
import fetch from 'node-fetch'
import mongoose from 'mongoose'

import Trace from './models/trace'

mongoose.connect('mongodb://localhost/moto')
mongoose.Promise = Promise

const port = 4040

const server =
  process.env.NODE_ENV === 'production'
    ? https.createServer({
        cert: fs.readFileSync('/etc/letsencrypt/live/balthazargronon.com/fullchain.pem'),
        key: fs.readFileSync('/etc/letsencrypt/live/balthazargronon.com/privkey.pem'),
      })
    : http.createServer()

const wss = new WebSocket.Server({ server })

server.listen(port, () => {
  console.log(`[GPS-TRACK] ${new Date()} Started on :${port}`)
})

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

      if (type === 'auth') {
        if (data.code === process.env.ACCESS_KEY) {
          socket.isAuthenticated = true
          console.log(`[Master login] ${new Date()} Success.`)
        } else {
          console.log(`[Master login] ${new Date()} Failed.`)
        }

        return
      }

      if (!socket.isAuthenticated) {
        return
      }

      Trace.create(data)

      wss.broadcast(JSON.stringify({ type: 'last', ...data }))
    } catch (err) {
      console.log('[GPS-TRACK] Error', err)
    }
  })
})
