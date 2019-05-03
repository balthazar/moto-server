import { createAction, handleActions } from 'redux-actions'

export const switchColorBy = createAction('SWITCH_COLOR_BY')

export default handleActions(
  {
    SWITCH_COLOR_BY: state => ({ ...state, colorBy: state.colorBy === 'speed' ? 'alt' : 'speed' }),
  },
  {
    colorBy: 'speed',
  },
)
