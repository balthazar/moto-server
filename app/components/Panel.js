import React, { Component } from 'react'
import ReactEchartsCore from 'echarts-for-react/lib/core'
import { DateTime } from 'luxon'
import styled from 'styled-components'
import { connect } from 'react-redux'
import capitalize from 'lodash/capitalize'

import echarts from 'echarts/lib/echarts'
import 'echarts/lib/chart/line'
import 'echarts/lib/chart/bar'
import 'echarts/lib/component/tooltip'
import 'echarts/lib/component/visualMap'

import pieces from '../pieces'
import { changeHovered } from '../reducers/map'
import { switchColorBy } from '../reducers/config'

const CHART_HEIGHT = 220

const Container = styled.div`
  min-width: 500px;
  height: ${CHART_HEIGHT}px;
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 20px;
  background-color: rgba(35, 35, 35, 0.8);
  overflow: hidden;
`

const Tools = styled.div`
  margin-bottom: 10px;
`

class Panel extends Component {
  constructor(props) {
    super(props)
    this.removeHover = this.removeHover.bind(this)
  }

  changeHover(dataIndex, color) {
    const { paths, changeHovered } = this.props
    const { lon, lat } = paths[paths.length - 1].data[dataIndex]

    changeHovered({ coords: [lon, lat], color })
  }

  removeHover() {
    this.props.changeHovered(null)
  }

  render() {
    const { paths, colorBy, switchColorBy } = this.props

    return (
      <Container onMouseLeave={this.removeHover}>
        <Tools>
          <button onClick={switchColorBy}>switch mode</button>
        </Tools>
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
              data: paths[paths.length - 1].data.map(d => d.time),
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
              data: paths[paths.length - 1].data.map(d => d[colorBy]),
            },
          }}
          notMerge
          lazyUpdate
        />
      </Container>
    )
  }
}

export default connect(
  ({ map: { paths, hovered }, config: { colorBy } }) => ({
    paths,
    colorBy,
  }),
  { changeHovered, switchColorBy },
)(Panel)
