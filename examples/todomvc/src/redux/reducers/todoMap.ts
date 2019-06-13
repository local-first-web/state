import { ADD_TODO, TOGGLE_TODO, DESTROY_TODO, EDIT_TODO } from '../actions'
import { Reducer } from 'redux'

export const todoMap: Reducer = (state = {}, { type, payload }) => {
  switch (type) {
    case ADD_TODO: {
      const { id, content } = payload
      return {
        ...state,
        [id]: {
          content: content,
          completed: false,
        },
      }
    }
    case TOGGLE_TODO: {
      const { id } = payload
      const currentTodo = state[id]
      return {
        ...state,
        [id]: {
          ...currentTodo,
          completed: !currentTodo.completed,
        },
      }
    }
    case EDIT_TODO: {
      const { id, content } = payload
      const currentTodo = state[id]
      return {
        ...state,
        [id]: { ...currentTodo, content: content },
      }
    }
    case DESTROY_TODO: {
      const { id } = payload
      const { [id]: _, ...rest } = state
      return rest
    }
    default:
      return state
  }
}
