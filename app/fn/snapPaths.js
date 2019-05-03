import fetch from 'node-fetch'

const main = async trips => {
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

export default main
