import { adaptReducer, ProxyReducer } from 'cevitxe'
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
      return state => (state.visibilityFilter = payload.filter)

    case ADD_TODO: {
      const { id, content } = payload
      return state => {
        state.todoList.push(id)
        state.todoMap[id] = { id, content, completed: false }
      }
    }

    case DESTROY_TODO: {
      const { id } = payload
      return state => {
        delete state.todoMap[id]
        state.todoList = state.todoList.filter(_id => _id !== payload.id)
      }
    }

    case TOGGLE_TODO: {
      const { id } = payload
      return state =>
        (state.todoMap[id].completed = !state.todoMap[id].completed)
    }

    case EDIT_TODO: {
      const { id, content } = payload
      return state => (state.todoMap[id].content = content)
    }

    default:
      return null
  }
}

export const reducer = adaptReducer(proxyReducer) as Reducer<State, Action>
