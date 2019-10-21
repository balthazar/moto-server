import http from 'http'
import https from 'https'
import fs from 'fs'
import fetch from 'node-fetch'

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
  console.log(`[MOTO-SERVER] ${new Date()} Started on :${port}`)
})

wss.broadcast = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

wss.on('connection', socket => {
  socket.on('message', async message => {
    try {
      const { type, ...data } = JSON.parse(message)

      if (type === 'auth') {
        if (data.code === process.env.ACCESS_KEY) {
          socket.isAuthenticated = true
          console.log(`[Auth] ${new Date()} Success.`)
        } else {
          console.log(`[Auth] ${new Date()} Failed.`)
        }

        return
      }

      if (type === 'getChatters') {
        const fet = await fetch('https://tmi.twitch.tv/group/user/sneakware/chatters')
        const json = await fet.json()

        const users = Object.keys(json.chatters)
          .reduce((acc, cur) => acc.concat(json.chatters[cur]), [])
          .filter(u => u !== 'streamlabs' && u !== 'sneakware')

        socket.send({ type: 'chatters', data: users })
      }

      if (!socket.isAuthenticated) {
        return
      }

      if (type === 'control') {
      }

      if (type === 'trace') {
        process.stdout.write('.')
        Trace.create(data)
      }
    } catch (err) {
      console.log('[MOTO-SERVER] Error', err)
    }
  })
})
