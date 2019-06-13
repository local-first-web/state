import { State, Action } from 'src/types'
import { ActionType } from './actions'
import { ProxyReducer } from './automerge/types'
import { automergeReducer } from './automerge/automergeReducer'

// Note: React's `Reducer` type is not the same as Redux's `Reducer` type;
// the difference is that the Redux reducer is of type <T | undefined>
import { Reducer } from 'react'

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

// When using this in React without Redux, the result of `automergeReducer` has
// to be cast to a React reducer.
export const reducer = automergeReducer(proxyReducer) as Reducer<State, Action>
