import { handleActions, createAction } from 'redux-actions'

export const setTrips = createAction('SET_TRIPS')
export const selectTrip = createAction('SELECT_TRIP')
export const changeHovered = createAction('CHANGE_HOVERED')

export default handleActions(
  {
    SET_TRIPS: (state, { payload: trips }) => ({...state, trips }),
    SELECT_TRIP: (state, { payload: selectedTrip }) => ({...state, selectedTrip }),
    CHANGE_HOVERED: (state, { payload: hovered }) => ({ ...state, hovered }),
  },
  {
    hovered: null,
    selectedTrip: null,
    trips: [],
  },
)
