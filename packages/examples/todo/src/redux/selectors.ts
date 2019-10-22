import { VisibilityFilter, RepoState } from '../types'

export const getVisibilityFilter = (repoState: RepoState) => {
  const state = repoState.root
  if (!state || !state.visibilityFilter) return VisibilityFilter.ALL
  return state.visibilityFilter
}

export const getTodo = (id: string) => (repoState: RepoState) => {
  const state = repoState.root
  return {
    ...state.todoMap[id],
    id,
  }
}

export const getAllTodos = (repoState: RepoState) => {
  const state = repoState.root
  if (!state || !state.todoList) return []
  return state.todoList.map(id => getTodo(id)(repoState))
}

export const getFilteredTodos = (filter: VisibilityFilter) => (repoState: RepoState) => {
  const allTodos = getAllTodos(repoState)
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

export const getVisibleTodos = (repoState: RepoState) => {
  const visibilityFilter = getVisibilityFilter(repoState)
  return getFilteredTodos(visibilityFilter)(repoState)
}
