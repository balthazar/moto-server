import React, { Component } from 'react'
import { connect } from 'react-redux'
import { StaticMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import imm from 'object-path-immutable'
import get from 'lodash/get'

import MultiColorPathLayer from './multi-color-path-layer'

import pieces from '../pieces'
import { setTrips, selectTrip, changeHovered } from '../reducers/map'
import { getPointDistance } from '../fn/turfUtils'

import data from '../../db.json'

const INITIAL_VIEW_STATE = {
  latitude: 37.787689153,
  longitude: -122.414607454,
  zoom: 12,
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

const createTrips = colorBy => {
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

    const distanceFromPrev = getPointDistance([prev.lon, prev.lat], [lon, lat])
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

const getClosestPoint = (tripData, coordinate) =>
  tripData.reduce(
    (acc, cur, index) => {
      const distance = getPointDistance(coordinate, [cur.lon, cur.lat])

      if (!acc.data || distance < acc.distance) {
        return { distance, data: cur, index }
      }

      return acc
    },
    { data: null, distance: -1, index: -1 },
  )

class Map extends Component {
  componentWillMount() {
    const { colorBy } = this.props
    const trips = createTrips(colorBy)
    this.props.setTrips(trips)

    this.onHover = this.onHover.bind(this)
    this.onClick = this.onClick.bind(this)
  }

  componentWillUpdate(nextProps) {
    if (nextProps.colorBy !== this.props.colorBy) {
      const trips = createTrips(nextProps.colorBy)
      this.props.setTrips(trips)
    }
  }

  onHover(info) {
    const { colorBy, hovered, trips, selectedTrip } = this.props

    const pathIndex =
      isNaN(info.index) || info.index < -1 || info.layer.id === 'hover'
        ? get(hovered, 'pathIndex')
        : info.index

    const trip = selectedTrip || trips[pathIndex]
    if (!trip) {
      return
    }

    const { data, index } = getClosestPoint(trip.data, info.coordinate)

    const color = getColor(data[colorBy], colorBy)
    this.props.changeHovered({
      coords: [data.lon, data.lat],
      color,
      pathIndex,
      pointIndex: index,
    })
  }

  onClick() {
    const { hovered } = this.props
    this.props.selectTrip(hovered ? hovered.pathIndex : null)
  }

  render() {
    const { trips, selectedTrip, hovered } = this.props

    const layers = [
      new MultiColorPathLayer({
        id: 'path-layer',
        data: selectedTrip ? [selectedTrip] : trips,
        pickable: true,
        widthScale: 1,
        widthMinPixels: 2,
        getPath: d => d.path,
        getColor: d => d.color,
        getWidth: () => 5,
        onHover: this.onHover,
      }),

      hovered &&
        new ScatterplotLayer({
          id: 'hover',
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
          getRadius: () => 10,
          getFillColor: d => hexToRgb(d.color),
          getLineColor: () => [0, 0, 0],
          onHover: this.onHover,
        }),
    ].filter(f => f)

    return (
      <div onClick={this.onClick}>
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
      </div>
    )
  }
}

export default connect(
  ({ map: { hovered, trips, selectedTrip }, config: { colorBy } }) => ({
    hovered,
    trips,
    colorBy,
    selectedTrip: get(trips, [selectedTrip]),
  }),
  { setTrips, selectTrip, changeHovered },
)(Map)
