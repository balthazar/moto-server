import { createStore, applyMiddleware, compose } from 'redux'

import reducer from './reducers'

export default (initialState) => {
  const devTools = window.devToolsExtension ? window.devToolsExtension() : f => f
  const middlewares = []
  const enhancers = compose(
    applyMiddleware(...middlewares),
    devTools,
  )

  const store = createStore(reducer, initialState, enhancers)

  if (module.hot) {
    module.hot.accept('./reducers', () => {
      const nextRootReducer = require('./reducers')
      store.replaceReducer(nextRootReducer)
    })
  }

  return store
}
