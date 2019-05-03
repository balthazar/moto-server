const ws = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')
const gpsd = require('node-gpsd')

const socket = new ReconnectingWebSocket('ws://balthazargronon.com:4040', null, {
  WebSocket: ws,
  debug: true,
  reconnectInterval: 3000,
})

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
