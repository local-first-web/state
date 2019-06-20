import { VisibilityFilter, State } from '../types'
import { DocSet } from 'automerge'
import { DOC_ID } from '@cevitxe/core'

const getDoc = (state: DocSet<State>): State => {
  // More interesting logic to get the doc ID here?
  return state.getDoc(DOC_ID)
}

export const getVisibilityFilter = (state: State) => {
  if (!state || !state.visibilityFilter) return VisibilityFilter.ALL
  return state.visibilityFilter
}

export const getTodo = (id: string) => (state: State) => ({
  ...state.todoMap[id],
  id,
})

export const getAllTodos = (state: State) => {
  if (!state || !state.todoList) return []
  return state.todoList.map(id => getTodo(id)(state))
}

export const getFilteredTodos = (filter: VisibilityFilter) => (
  state: DocSet<State>
) => {
  const stateDoc = getDoc(state)
  const allTodos = getAllTodos(stateDoc)

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

export const getVisibleTodos = (state: DocSet<State>) => {
  const stateDoc = getDoc(state)
  const visibilityFilter = getVisibilityFilter(stateDoc)
  return getFilteredTodos(visibilityFilter)(state)
}
