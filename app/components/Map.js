import React, { Component } from 'react'
import { connect } from 'react-redux'
import { StaticMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import * as turf from '@turf/turf'
import imm from 'object-path-immutable'

import MultiColorPathLayer from './multi-color-path-layer'

import pieces from '../pieces'
import { setPaths, changeHovered } from '../reducers/map'

import data from '../../db.json'

const INITIAL_VIEW_STATE = {
  latitude: 37.787689153,
  longitude: -122.414607454,
  zoom: 14,
}

const hexToRgb = hex =>
  hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => `#${r + r + g + g + b + b}`)
    .substring(1)
    .match(/.{2}/g)
    .map(x => parseInt(x, 16))

const getColor = (value, colorBy) => {
  for (let i = 0; i < pieces[colorBy].length; ++i) {
    const { lte, color } = pieces[colorBy][i]
    if (value <= lte) {
      return color
    }
  }

  return pieces[colorBy][pieces[colorBy].length - 1].color
}

const getDistance = (a, b) => {
  const from = turf.point(a)
  const to = turf.point(b)
  return turf.distance(from, to, { units: 'meters' })
}

const createPaths = colorBy => {
  const trips = data.traces.reduce((acc, cur, i) => {
    const { lat, lon, time } = cur

    const payload = {
      ...cur,
      speed: (2.2369 * cur.speed).toFixed(0),
    }

    const color = hexToRgb(getColor(payload[colorBy], colorBy))

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
    const { colorBy } = this.props
    this.props.setPaths(createPaths(colorBy))
  }

  componentWillUpdate(nextProps) {
    if (nextProps.colorBy !== this.props.colorBy) {
      this.props.setPaths(createPaths(nextProps.colorBy))
    }
  }

  render() {
    const { paths, hovered, colorBy } = this.props

    const onHover = info => {
      if (!info.object) {
        return this.props.changeHovered(null)
      }

      const pathIndex = info.index || (hovered && hovered.pathIndex)
      if (!pathIndex) {
        return
      }

      const { data } = paths[pathIndex].data.reduce(
        (acc, cur) => {
          const distance = getDistance(info.coordinate, [cur.lon, cur.lat])

          if (!acc.data || distance < acc.distance) {
            return { distance, data: cur }
          }

          return acc
        },
        { data: null, distance: -1 },
      )

      const color = getColor(data[colorBy], colorBy)
      this.props.changeHovered({
        coords: [data.lon, data.lat],
        color,
        pathIndex,
      })
    }

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
        onHover,
      }),

      hovered &&
        new ScatterplotLayer({
          id: 'scatterplot-layer',
          data: [hovered],
          pickable: true,
          opacity: 0.8,
          stroked: false,
          filled: true,
          radiusScale: 3,
          radiusMinPixels: 1,
          radiusMaxPixels: 100,
          lineWidthMinPixels: 1,
          getPosition: d => d.coords,
          getRadius: d => 10,
          getFillColor: d => hexToRgb(d.color),
          getLineColor: d => [0, 0, 0],
          onHover,
        }),
    ].filter(f => f)

    return (
      <DeckGL
        ref={c => (this.deckGL = c)}
        initialViewState={INITIAL_VIEW_STATE}
        controller
        pickingRadius={30}
        layers={layers}
      >
        <StaticMap
          mapboxApiAccessToken={process.env.MapboxAccessToken}
          mapStyle="mapbox://styles/mapbox/dark-v10"
        />
      </DeckGL>
    )
  }
}

export default connect(
  ({ map: { hovered, paths }, config: { colorBy } }) => ({ hovered, paths, colorBy }),
  { setPaths, changeHovered },
)(Map)
