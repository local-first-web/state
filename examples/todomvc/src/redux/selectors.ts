import { VisibilityFilter, State } from '../types'

export const getVisibilityFilter = (state: State) => state.visibilityFilter

export const getTodo = (id: string) => (state: State) => ({
  ...state.todoMap[id],
  id,
})

export const getAllTodos = (state: State) =>
  state.todoList.map(id => getTodo(id)(state))

export const getFilteredTodos = (filter: VisibilityFilter) => (
  state: State
) => {
  const allTodos = getAllTodos(state)

  switch (filter) {
    case VisibilityFilter.ALL:
      return allTodos
    case VisibilityFilter.INCOMPLETE:
      return allTodos.filter(todo => !todo.completed)
    case VisibilityFilter.COMPLETED:
      return allTodos.filter(todo => todo.completed)
    default:
      throw new Error(`Unknown visibility filter '${filter}'`)
  }
}

export const getVisibleTodos = (state: State) => {
  const visibilityFilter = getVisibilityFilter(state)
  return getFilteredTodos(visibilityFilter)(state)
}
