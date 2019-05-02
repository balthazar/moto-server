import React, { Component } from 'react'
import { connect } from 'react-redux'
import { StaticMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import * as turf from '@turf/turf'
import imm from 'object-path-immutable'

import MultiColorPathLayer from './multi-color-path-layer'

import pieces from '../pieces'
import config from '../config'
import { setPaths } from '../reducers/map'

import data from '../../db.json'

const INITIAL_VIEW_STATE = {
  latitude: 37.787689153,
  longitude: -122.414607454,
  zoom: 15,
}

const hexToRgb = hex =>
  hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1)
    .match(/.{2}/g)
    .map(x => parseInt(x, 16))

const getSpeedColor = value => {
  for (let i = 0; i < pieces[config.colorBy].length; ++i) {
    const { lte, color } = pieces[config.colorBy][i]
    if (value <= lte) {
      return color
    }
  }

  return pieces[config.colorBy][pieces[config.colorBy].length - 1].color
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

const createPaths = () => {
  const getColor = v => hexToRgb(colorsFn[config.colorBy](v))

  const trips = data.traces.reduce((acc, cur, i) => {
    const { lat, lon, time } = cur

    const payload = {
      ...cur,
      speed: (2.2369 * cur.speed).toFixed(0),
    }

    const color = getColor(payload[config.colorBy])

    const prev = i > 0 && data.traces[i - 1]

    if (!prev || Math.abs(time - prev.time) > 3600000) {
      return [...acc, { path: [[lon, lat]], color: [color], data: [payload] }]
    }

    const distanceFromPrev = getDistance([prev.lon, prev.lat], [lon, lat])
    if (distanceFromPrev < 2) {
      return acc
    }

    return imm.update(acc, [acc.length - 1], v => ({
      ...v,
      path: v.path.concat([[lon, lat]]),
      color: v.color.concat([color]),
      data: v.data.concat([payload]),
    }))
  }, [])

  return trips
}

class Map extends Component {
  componentWillMount() {
    this.props.setPaths(createPaths())
  }

  render() {
    const { paths, hovered } = this.props

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

      hovered &&
        new ScatterplotLayer({
          id: 'scatterplot-layer',
          data: [hovered],
          pickable: true,
          opacity: 0.8,
          stroked: true,
          filled: true,
          radiusScale: 6,
          radiusMinPixels: 1,
          radiusMaxPixels: 100,
          lineWidthMinPixels: 1,
          getPosition: d => d.coords,
          getRadius: d => 3,
          getFillColor: d => hexToRgb(d.color),
          getLineColor: d => [0, 0, 0],
        }),
    ].filter(f => f)

    return (
      <DeckGL initialViewState={INITIAL_VIEW_STATE} controller layers={layers}>
        <StaticMap
          mapboxApiAccessToken={process.env.MapboxAccessToken}
          mapStyle="mapbox://styles/mapbox/dark-v10"
        />
      </DeckGL>
    )
  }
}

export default connect(
  ({ map: { hovered, paths } }) => ({ hovered, paths }),
  { setPaths },
)(Map)
