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
  paused: false,
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

      if (!socket.isAuthenticated) {
        return
      }

      if (type === 'getTraces') {
        const traces = await Traces.find()
        socket.send(JSON.stringify({ type: 'traces', data: traces }))
      }

      if (type === 'pause') {
        state.paused = true
      }

      if (type === 'play') {
        state.paused = false
      }

      if (type === 'forward') {
        state.currentTime += 10
        state.currentTs += 10000
      }

      if (type === 'stop') {
        clearInterval(state.intervalId)
        wss.broadcast(JSON.stringify({ type: 'reset' }))
        state.traces = []
      }

      if (type === 'bootstrap') {
        wss.broadcast(JSON.stringify({ type: 'reset' }))

        clearInterval(state.intervalId)
        state.currentTime = null
        state.currentTrace = null
        state.currentTs = null
        state.currentSplit = null
        state.paused = false

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
          if (state.paused) {
            return
          }

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
            wss.broadcast(JSON.stringify({ type: 'replay', data: state.currentTrace }))
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
