import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { StaticMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import { PathLayer } from '@deck.gl/layers'
import imm from 'object-path-immutable'
import fetch from 'node-fetch'
import * as turf from '@turf/turf'

import data from '../db.json'

import MultiColorPathLayer from './multi-color-path-layer'

const INITIAL_VIEW_STATE = {
  latitude: 37.787689153,
  longitude: -122.414607454,
  zoom: 15,
}

const getSpeedColor = value => {
  if (value < 5) {
    return [255, 130, 68]
  }
  if (value < 10) {
    return [255, 182, 0]
  }
  if (value < 15) {
    return [213, 213, 0]
  }
  if (value < 25) {
    return [126, 170, 0]
  }
  return [55, 128, 0]
}

const getAltitudeColor = value => {
  if (value < 30) {
    return [255, 130, 68]
  }
  if (value < 50) {
    return [255, 182, 0]
  }
  if (value < 75) {
    return [213, 213, 0]
  }
  if (value < 100) {
    return [126, 170, 0]
  }

  return [55, 128, 0]
}

const colorsFn = {
  speed: getSpeedColor,
  alt: getAltitudeColor,
}

const getDistance = (a, b) => {
  const from = turf.point(a)
  const to = turf.point(b)
  return turf.distance(from, to, { units: 'meters' })
}

const snapPaths = async trips => {
  const snapped = await Promise.all(
    trips.map(async trip => {
      const res = await fetch(
        `https://api.mapbox.com/matching/v5/mapbox/driving?access_token=${
          process.env.MapboxAccessToken
        }`,
        {
          method: 'post',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `coordinates=${trip.path
            .slice(0, 100)
            .map(p => `${p[0]},${p[1]}`)
            .join(';')}`,
        },
      )
      const json = await res.json()
      return json
    }),
  )

  return snapped.map(n => ({
    path: n.tracepoints.filter(f => f).map(p => p.location),
    color: [0, 0, 200],
  }))
}

const createPaths = async () => {
  const colorBy = 'speed'
  const getColor = colorsFn[colorBy]

  const trips = data.traces.reduce((acc, cur, i) => {
    const { lat, lon, time } = cur

    const prev = i > 0 && data.traces[i - 1]

    if (!prev || Math.abs(time - prev.time) > 3600000) {
      return [...acc, { path: [[lon, lat]], color: [getColor(cur[colorBy])], data: [cur] }]
    }

    const distanceFromPrev = getDistance([prev.lon, prev.lat], [lon, lat])
    if (distanceFromPrev < 2) {
      return acc
    }

    return imm.update(acc, [acc.length - 1], v => ({
      ...v,
      path: v.path.concat([[lon, lat]]),
      color: v.color.concat([getColor(cur[colorBy])]),
      data: v.data.concat([cur]),
    }))
  }, [])

  return trips
}

class App extends Component {
  constructor(props) {
    super(props)
    this.state = { paths: [] }
  }

  componentDidMount() {
    createPaths().then(paths => {
      this.setState({ paths })
    })
  }

  render() {
    const { paths } = this.state

    const layers = [
      new MultiColorPathLayer({
        id: 'path-layer',
        data: paths,
        pickable: true,
        widthScale: 1,
        widthMinPixels: 2,
        getPath: d => d.path,
        getColor: d => d.color,
        getWidth: d => 5,
        onHover: ({ object, x, y }) => {
          console.log(object)
        },
      }),
    ]

    return (
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller={true} layers={layers}>
        <StaticMap
          mapboxApiAccessToken={process.env.MapboxAccessToken}
          mapStyle="mapbox://styles/mapbox/dark-v10"
        />
      </DeckGL>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'))

if (module.hot) {
  module.hot.accept()
}
