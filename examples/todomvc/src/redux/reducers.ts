import { automergeReducer, ProxyReducer } from 'cevitxe'
import { Reducer } from 'redux'
import { Action, State } from 'src/types'
import { ActionType } from './actions'

const {
  SET_FILTER,
  ADD_TODO,
  DESTROY_TODO,
  TOGGLE_TODO,
  EDIT_TODO,
} = ActionType

const proxyReducer: ProxyReducer<State> = ({ type, payload }) => {
  switch (type) {
    case SET_FILTER:
      return s => (s.visibilityFilter = payload.filter)

    case ADD_TODO: {
      const { id, content } = payload
      return s => {
        s.todoList.push(id)
        s.todoMap[id] = { id, content, completed: false }
      }
    }

    case DESTROY_TODO: {
      const { id } = payload
      return s => {
        delete s.todoMap[id]
        s.todoList = s.todoList.filter(_id => _id !== payload.id)
      }
    }

    case TOGGLE_TODO: {
      const { id } = payload
      return s => (s.todoMap[id].completed = !s.todoMap[id].completed)
    }

    case EDIT_TODO: {
      const { id, content } = payload
      return s => (s.todoMap[id].content = content)
    }

    default:
      return null
  }
}

export const reducer = automergeReducer(proxyReducer) as Reducer<State, Action>
