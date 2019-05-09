import React, { Component } from 'react'
import { connect } from 'react-redux'
import { StaticMap } from 'react-map-gl'
import DeckGL from '@deck.gl/react'
import { ScatterplotLayer } from '@deck.gl/layers'
import get from 'lodash/get'

import MultiColorPathLayer from './multi-color-path-layer'

import { setTrips, selectTrip, changeHovered } from '../reducers/map'
import { createTrips, getClosestPoint, getColor, hexToRgb, OPACITY_COLOR } from '../fn/tripUtils'

const INITIAL_VIEW_STATE = {
  latitude: 37.787689153,
  longitude: -122.414607454,
  zoom: 12,
}

class Map extends Component {
  componentWillMount() {
    const { colorBy } = this.props
    const trips = createTrips(colorBy)
    this.props.setTrips(trips)

    this.onHover = this.onHover.bind(this)
    this.onClick = this.onClick.bind(this)
  }

  componentWillUpdate(nextProps) {
    if (nextProps.colorBy !== this.props.colorBy && nextProps.colorBy !== 'opacity') {
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

    const color = colorBy === 'opacity' ? OPACITY_COLOR : getColor(data[colorBy], colorBy)
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
    const { trips, selectedTrip, colorBy, hovered } = this.props

    const layers = [
      new MultiColorPathLayer({
        id: 'path-layer',
        data: selectedTrip ? [selectedTrip] : trips,
        pickable: true,
        widthScale: 1,
        widthMinPixels: 2,
        getWidth: 20,
        opacity: colorBy === 'opacity' ? 0.1 : 1,
        getColor: colorBy === 'opacity' ? OPACITY_COLOR : d => d.color,
        getPath: d => d.path,
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
          getRadius: 10,
          getPosition: d => d.coords,
          getFillColor: colorBy === 'opacity' ? OPACITY_COLOR : d => hexToRgb(d.color),
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
