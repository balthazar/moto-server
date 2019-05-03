import { combineReducers } from 'redux'

import map from './map'
import config from './config'

export default combineReducers({
  map,
  config,
})
