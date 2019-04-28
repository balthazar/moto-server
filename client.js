const ws = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')
const gpsd = require('node-gpsd')

const socket = new ReconnectingWebSocket('ws://localhost:4040', null, {
  WebSocket: ws,
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
    socket.send(JSON.stringify({ lat, lon, alt, speed, climb }))
  })

  listener.connect(() => {
    console.log('[Connected]')

    setInterval(() => {
      socket.send(JSON.stringify({ lat: 10, lon: 1, alt: 11, speed: 0, climb: 0 }))
    }, 2e3)

    listener.watch()
  })
})
