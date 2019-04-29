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

daemon.start(() => {
  const listener = new gpsd.Listener()

  socket.send(JSON.stringify({ type: 'auth', code: process.env.ACCESS_KEY }))

  listener.on('TPV', data => {
    const { lat, lon, alt, speed, climb } = data
    if (!lat || !lon) {
      return
    }

    socket.send(JSON.stringify({ time: Date.now(), lat, lon, alt, speed, climb }))
  })

  listener.connect(() => {
    console.log('[Connected]')
    listener.watch()
  })
})
