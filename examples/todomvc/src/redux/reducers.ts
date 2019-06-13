import { combineReducers } from 'redux'
import { visibilityFilter } from './reducers/visibilityFilter'
import { todoList } from './reducers/todoList'
import { todoMap } from './reducers/todoMap'

export const reducers = combineReducers({
  visibilityFilter,
  todoList,
  todoMap,
})
