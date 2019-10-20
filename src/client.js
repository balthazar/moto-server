import ws from 'ws'
import ReconnectingWebSocket from 'reconnecting-websockets'
import gpsd from 'node-gpsd'

const socket = new ReconnectingWebSocket('wss://balthazargronon.com:4040', null, {
  WebSocket: ws,
  debug: true,
  reconnectInterval: 3000,
})

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

const daemon = new gpsd.Daemon({
  program: 'gpsd',
  device: '/dev/ttyACM0',
  port: 2947,
  pid: '/tmp/gpsd.pid',
  readOnly: false,
  verbose: true,
})

socket.addEventListener('open', () => {
  socket.send(JSON.stringify({ type: 'auth', code: process.env.ACCESS_KEY }))
})

daemon.start(() => {
  const listener = new gpsd.Listener()

  listener.on('TPV', data => {
    const { lat, lon, alt, speed, climb, ecefpAcc: accuracy } = data
    if (!lat || !lon) {
      return
    }

    if (accuracy > 100) {
      return console.log('[Ignoring inaccurate point]')
    }

    socket.send(JSON.stringify({ time: Date.now(), lat, lon, alt, speed, climb, accuracy }))
  })

  listener.connect(() => {
    console.log('[Connected]')
    listener.watch()
  })
})
