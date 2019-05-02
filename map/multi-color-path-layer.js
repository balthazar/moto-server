import { PathLayer } from '@deck.gl/layers'

// PathLayer subclass by @dcposch
export default class MultiColorPathLayer extends PathLayer {
  calculateColors(attribute) {
    const { data, getPath, getColor } = this.props
    const { value } = attribute

    let i = 0

    for (const object of data) {
      const path = getPath(object)
      const color = getColor(object)
      if (Array.isArray(color[0])) {
        if (color.length !== path.length) {
          throw new Error(
            "PathLayer getColor() returned a color array, but the number of colors returned doesn't match the number of segments in the path.",
          )
        }

        color.forEach(segmentColor => {
          value[i++] = segmentColor[0]
          value[i++] = segmentColor[1]
          value[i++] = segmentColor[2]
          value[i++] = isNaN(segmentColor[3]) ? 255 : segmentColor[3]
        })
      } else {
        for (let ptIndex = 1; ptIndex < path.length; ptIndex++) {
          value[i++] = color[0]
          value[i++] = color[1]
          value[i++] = color[2]
          value[i++] = isNaN(color[3]) ? 255 : color[3]
        }
      }
    }
  }
}

MultiColorPathLayer.layerName = 'MultiColorPathLayer'
