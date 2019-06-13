import { VisibilityFilter } from '../../types'
import { SET_FILTER } from '../actions'
import { Reducer } from 'redux'

export const visibilityFilter: Reducer = (
  state = VisibilityFilter.ALL,
  { type, payload }
) => {
  switch (type) {
    case SET_FILTER:
      return payload.filter
    default:
      return state
  }
}
