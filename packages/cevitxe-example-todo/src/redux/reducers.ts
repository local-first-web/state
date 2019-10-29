import { ProxyReducer } from 'cevitxe'
import { ActionType } from './actions'

const { SET_FILTER, ADD_TODO, DESTROY_TODO, TOGGLE_TODO, EDIT_TODO } = ActionType

export const proxyReducer: ProxyReducer = (state, { type, payload }) => {
  switch (type) {
    case SET_FILTER:
      return { root: s => (s.visibilityFilter = payload.filter) }

    case ADD_TODO: {
      const { id, content } = payload
      return {
        root: s => {
          s.todoList.push(id)
          s.todoMap[id] = { id, content, completed: false }
        },
      }
    }

    case DESTROY_TODO: {
      const { id } = payload
      return {
        root: s => {
          delete s.todoMap[id]
          s.todoList = s.todoList.filter((_id: string) => _id !== payload.id)
        },
      }
    }

    case TOGGLE_TODO: {
      const { id } = payload
      return {
        root: s => (s.todoMap[id].completed = !s.todoMap[id].completed),
      }
    }

    case EDIT_TODO: {
      const { id, content } = payload
      return {
        root: s => (s.todoMap[id].content = content),
      }
    }

    default:
      return null
  }
}
