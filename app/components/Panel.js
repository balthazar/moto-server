import React, { Component } from 'react'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import { DateTime } from 'luxon'
import styled from 'styled-components'
import { connect } from 'react-redux'
import capitalize from 'lodash/capitalize'
import get from 'lodash/get'

import echarts from 'echarts/lib/echarts'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/visualMap'

import pieces from '../pieces'
import { changeHovered, selectTrip } from '../reducers/map'
import { switchColorBy } from '../reducers/config'
import { getPathDistance } from '../fn/turfUtils'

const CHART_HEIGHT = 220

const Container = styled.div`
  min-width: 500px;
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 20px;
  background-color: rgba(35, 35, 35, 0.8);
  font-family: monospace;
  color: white;
`

const ChartContainer = styled.div`
  overflow: hidden;
  height: ${CHART_HEIGHT}px;
`

const TripsBrowser = styled.div`
  color: white;
  overflow: auto;
  min-height: 100px;
  max-height: 200px;

  > div + div {
    margin-top: 5px;
  }
`

const TripItem = styled.div`
  cursor: pointer;
  ${p => (p.selected ? 'color: #03a9f4;' : '')};
`

const Tools = styled.div`
  margin-bottom: 10px;

  .mode {
    position: absolute;
    right: 20px;
    padding: 5px;
    background-color: rgba(0, 0, 0, 0.2);
  }
`

const timeDiff = (a, b) => {
  const start = DateTime.fromMillis(Number(a))
  const end = DateTime.fromMillis(Number(b))

  const {
    values: { hours: h, minutes: m },
  } = end.diff(start, ['hours', 'minutes'])

  return `(${h ? `${h}h` : ''}${m.toFixed(0)}m)`
}

class Panel extends Component {
  constructor(props) {
    super(props)

    this.state = {
      focus: false,
    }

    this.addFocus = this.addFocus.bind(this)
    this.removeHover = this.removeHover.bind(this)
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.pointIndex !== this.props.pointIndex && this._chart) {
      const hide = isNaN(nextProps.pointIndex)
      this._chart.getEchartsInstance().dispatchAction({
        type: hide ? 'hideTip' : 'showTip',
        seriesIndex: 0,
        dataIndex: nextProps.pointIndex,
      })

      this._blockUpdate = true

      return false
    }

    this._blockUpdate = false

    return true
  }

  changeHover(dataIndex, color) {
    const { focus } = this.state
    const { selectedTrip, changeHovered } = this.props
    const { lon, lat } = selectedTrip.data[dataIndex]

    if (!focus && this._blockUpdate) {
      return
    }

    changeHovered({
      coords: [lon, lat],
      color,
    })
  }

  addFocus() {
    this.setState({ focus: true })
  }

  removeHover() {
    this.setState({ focus: false })
    this.props.changeHovered(null)
  }

  render() {
    const { trips, selectedTrip, colorBy, switchColorBy, selectTrip } = this.props

    return (
      <Container onMouseEnter={this.addFocus} onMouseLeave={this.removeHover}>
        <Tools>
          <span className="mode">{`mode: ${colorBy}`}</span>
          <button onClick={switchColorBy}>switch mode</button>
          {selectedTrip && <button onClick={() => selectTrip(null)}>unselect</button>}
        </Tools>

        {selectedTrip && (
          <ChartContainer>
            <ReactEchartsCore
              echarts={echarts}
              ref={e => (this._chart = e)}
              option={{
                height: CHART_HEIGHT - 40,
                tooltip: {
                  trigger: 'axis',
                  position: (point, params) => [
                    point[0] > 250 ? point[0] - 150 : point[0] + 10,
                    params[0].value > 20 ? '50%' : '5%',
                  ],
                  formatter: params =>
                    this.changeHover(params[0].dataIndex, params[0].color) ||
                    `
                    <div>
                      ${params
                        .map(
                          p => `
                          ${DateTime.fromMillis(Number(p.axisValue)).toLocaleString(
                            DateTime.DATETIME_SHORT_WITH_SECONDS,
                          )}<br />
                          ${p.marker} ${p.seriesName} ${p.data}
                      `,
                        )
                        .join('<br />')}
                    </div>
                  `,
                },
                grid: {
                  bottom: 20,
                  top: 10,
                  left: 30,
                  right: 90,
                },
                xAxis: {
                  data: selectedTrip.data.map(d => d.time),
                  axisLine: {
                    lineStyle: {
                      color: '#646464',
                    },
                  },
                  axisLabel: {
                    show: false,
                  },
                },
                yAxis: {
                  axisLine: {
                    lineStyle: {
                      color: '#646464',
                    },
                  },
                  splitLine: {
                    show: false,
                  },
                },
                visualMap: {
                  top: 10,
                  right: 0,
                  textStyle: {
                    color: '#646464',
                  },
                  pieces: pieces[colorBy],
                  outOfRange: {
                    color: '#999',
                  },
                },
                series: {
                  name: capitalize(colorBy),
                  type: 'line',
                  data: selectedTrip.data.map(d => d[colorBy]),
                },
              }}
              notMerge
              lazyUpdate
            />
          </ChartContainer>
        )}

        <TripsBrowser>
          {trips.map((trip, i) => (
            <TripItem
              selected={selectedTrip && trip.data[0].time === selectedTrip.data[0].time}
              onClick={() => selectTrip(i)}
              key={i}
            >
              <div>
                {DateTime.fromMillis(Number(trip.data[0].time)).toLocaleString(
                  DateTime.DATETIME_SHORT,
                )}{' '}
                {timeDiff(trip.data[0].time, trip.data[trip.data.length - 1].time)}
              </div>
              <div>{` ${trip.data.length} points - ${getPathDistance(trip.path)}km`}</div>
            </TripItem>
          ))}
        </TripsBrowser>
      </Container>
    )
  }
}

export default connect(
  ({ map: { trips, hovered, selectedTrip }, config: { colorBy } }) => ({
    trips,
    colorBy,
    pointIndex: get(hovered, 'pointIndex'),
    selectedTrip: get(trips, [selectedTrip]),
  }),
  { changeHovered, selectTrip, switchColorBy },
)(Panel)
