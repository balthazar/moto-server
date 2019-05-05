import imm from 'object-path-immutable'

import { getPointDistance } from './turfUtils'

import pieces from '../pieces'
import data from '../../db.json'

export const OPACITY_COLOR = [0, 235, 250]

export const hexToRgb = hex => {
  if (!hex || !hex.replace) {
    return [0, 0, 0]
  }

  return hex
    .replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => `#${r + r + g + g + b + b}`)
    .substring(1)
    .match(/.{2}/g)
    .map(x => parseInt(x, 16))
}

export const getColor = (value, colorBy) => {
  for (let i = 0; i < pieces[colorBy].length; ++i) {
    const { lte, color } = pieces[colorBy][i]
    if (value <= lte) {
      return color
    }
  }

  return pieces[colorBy][pieces[colorBy].length - 1].color
}

export const getClosestPoint = (tripData, coordinate) =>
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

export const createTrips = colorBy => {
  const trips = data.traces.reduce((acc, cur, i) => {
    const { lat, lon, time } = cur

    const payload = {
      ...cur,
      speed: (2.2369 * cur.speed).toFixed(0),
    }

    const color =
      colorBy === 'opacity' ? OPACITY_COLOR : hexToRgb(getColor(payload[colorBy], colorBy))

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
