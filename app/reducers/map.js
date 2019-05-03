import { handleActions, createAction } from 'redux-actions'

export const setPaths = createAction('SET_PATHS')
export const changeHovered = createAction('CHANGE_HOVERED')

export default handleActions(
  {
    SET_PATHS: (state, { payload: paths }) => ({...state, paths }),
    CHANGE_HOVERED: (state, { payload: hovered }) => ({ ...state, hovered }),
  },
  {
    hovered: null,
    paths: [],
  },
)
