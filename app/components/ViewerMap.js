import React, { useEffect, useState } from 'react'
import { StaticMap } from 'react-map-gl'
import { DeckGL, ScatterplotLayer, TripsLayer } from 'deck.gl'
import ReconnectingWebSocket from 'reconnecting-websocket'

export default () => {
  const [last, setLast] = useState({
    lat: 37.787689153,
    lon: -122.414607454,
  })

  const [traces, setTraces] = useState([])

  useEffect(() => {
    const socket = new ReconnectingWebSocket('ws://balthazargronon.com:4040', null, {
      WebSocket,
      debug: true,
      reconnectInterval: 3000,
    })

    socket.send(JSON.stringify({ type: 'viewer' }))
    socket.addEventListener('message', msg => {
      const data = JSON.parse(msg.data)
      if (data.type === 'viewerData') {
        setTraces(data.traces)
        setLast(data.last)
      }

      if (data.type === 'last') {
        setLast(data)
        setTraces([...traces, data])
      }
    })

    return () => socket.close()
  }, [true])

  const layers = [
    traces.length &&
      new TripsLayer({
        data: [{ traces }],
        getColor: [66, 134, 244],
        getPath: d => d.traces.map((t, i) => [t.lon, t.lat, i]),
        opacity: 1,
        widthMinPixels: 5,
        rounded: true,
        trailLength: traces.length < 500 ? traces.length / 2 : 500,
        currentTime: traces.length,
      }),

    last &&
      new ScatterplotLayer({
        id: 'last',
        data: [last],
        pickable: true,
        opacity: 1,
        stroked: false,
        filled: true,
        radiusScale: 3,
        radiusMinPixels: 1,
        radiusMaxPixels: 100,
        getRadius: 10,
        getPosition: d => [d.lon, d.lat],
        getFillColor: () => [39, 113, 232],
      }),
  ].filter(f => f)

  return (
    <DeckGL
      viewState={{ zoom: 14, latitude: last.lat, longitude: last.lon }}
      controller
      pickingRadius={30}
      layers={layers}
    >
      <StaticMap mapboxApiAccessToken={__MAPBOX__} mapStyle="mapbox://styles/mapbox/dark-v10" />
    </DeckGL>
  )
}
