import { ADD_TODO, DESTROY_TODO } from '../actions'
import { Reducer } from 'redux'
import { Todo } from '../../types'

export const todoList: Reducer = (state: Todo[] = [], { type, payload }) => {
  switch (type) {
    case ADD_TODO:
      return [...state, payload.id]
    case DESTROY_TODO:
      return state.filter(d => d !== payload.id)
    default:
      return state
  }
}
