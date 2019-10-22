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
  console.log(`[MOTO-SERVER] ${new Date()} Started on :${port}`)
})

wss.broadcast = data => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

const state = {
  intervalId: null,
  traces: [],
  currentTime: null,
  currentTs: null,
  currentTrace: null,
  currentSplit: null,
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

        //   const circle = turf.circle([last.lon, last.lat], 1000, { steps: 10, units: 'meters' })
        //   const box = turf.bbox(circle)

        //   const update = {}

        //   users.push('sneakware')

        //   for (let i = 0; i < users.length; ++i) {
        //     const name = users[i]
        //     if (usersCache[name]) {
        //       continue
        //     }

        //     const userRes = await fetch(`https://api.twitch.tv/helix/users?login=${name}`, {
        //       headers: {
        //         'Client-ID': 'z777edtct5ksb29wzc7la89udg02gk',
        //       },
        //     })

        //     const user = (await userRes.json()).data[0]
        //     const coordinates = turf.randomPosition(box)

        //     usersCache[name] = true
        //     update[name] = { ...user, coordinates }

        socket.send({ type: 'chatters', data: users })
      }

      if (!socket.isAuthenticated) {
        return
      }

      if (type === 'bootstrap') {
        clearInterval(state.intervalId)
        state.currentTime = 710 || null
        state.currentTrace = null

        const splits = data.value
          .trim()
          .split('\n')
          .map(s => {
            const [sec, ts] = s.split(':')
            return { sec: Number(sec), ts: Number(ts) }
          })
          .filter(s => s.ts)

        state.traces = await Trace.find({ time: { $gte: splits[0].ts } }).limit(10000)

        state.intervalId = setInterval(() => {
          state.currentTime += 0.1

          if (state.currentTs) {
            state.currentTs += 100
          }

          const split = splits.reduce((acc, cur) => {
            if (state.currentTime > cur.sec) {
              return cur
            }
            return acc
          }, null)

          if (!split) {
            return
          }

          if (!state.currentSplit || split.sec !== state.currentSplit.sec) {
            state.currentSplit = split
            state.currentTs = split.ts
            state.traces = state.traces.filter(t => t.time > split.ts)
          }

          if (state.traces.length >= 2 && state.traces[1].time <= state.currentTs) {
            state.currentTrace = state.traces.shift()
            wss.broadcast({ type: 'replay', data: state.currentTrace })
          }
        }, 100)
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
