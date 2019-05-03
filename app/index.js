import React, { Component } from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import Map from './components/Map'
import Panel from './components/Panel'

import createStore from './store'

const store = createStore()

class App extends Component {
  render() {
    return (
      <React.Fragment>
        <Map />
        <Panel />
      </React.Fragment>
    )
  }
}

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root'),
)

if (module.hot) {
  module.hot.accept()
}
