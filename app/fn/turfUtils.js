import * as turf from '@turf/turf'

export const getPointDistance = (a, b) => {
  if (!a || !b) {
    return
  }

  const from = turf.point(a)
  const to = turf.point(b)
  return turf.distance(from, to, { units: 'meters' })
}

export const getPathDistance = path =>
  path
    .reduce(
      (acc, cur) => {
        const to = turf.point(cur)
        if (!acc.last) {
          return { sum: 0, last: to }
        }

        const from = acc.last
        const distance = turf.distance(from, to)

        return { sum: acc.sum + distance, last: to }
      },
      { sum: 0, last: null },
    )
    .sum.toFixed(1)
