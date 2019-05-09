import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import DashboardMap from './components/DashboardMap'
import Panel from './components/Panel'
import ViewerMap from './components/ViewerMap'

import createStore from './store'

const store = createStore()

const apps = {
  viewer: () => <ViewerMap />,
  dashboard: () => (
    <>
      <DashboardMap />
      <Panel />
    </>
  ),
}

const App = apps[__APP__] || apps.viewer

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root'),
)

if (module.hot) {
  module.hot.accept()
}
