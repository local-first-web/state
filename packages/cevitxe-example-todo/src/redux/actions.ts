import uuid from 'uuid'
import { VisibilityFilter } from '../types'

export enum ActionType {
  ADD_TODO = 'ADD_TODO',
  TOGGLE_TODO = 'TOGGLE_TODO',
  EDIT_TODO = 'EDIT_TODO',
  DESTROY_TODO = 'DESTROY_TODO',
  SET_FILTER = 'SET_FILTER',
  CLEAR_COMPLETED = 'CLEAR_COMPLETED',
}

export const actions = {
  addTodo: (content: string) => ({
    type: ActionType.ADD_TODO,
    payload: { content, id: uuid() },
  }),

  toggleTodo: (id: string) => ({
    type: ActionType.TOGGLE_TODO,
    payload: { id },
  }),

  editTodo: (id: string, content: string) => ({
    type: ActionType.EDIT_TODO,
    payload: { id, content },
  }),

  destroyTodo: (id: string) => ({
    type: ActionType.DESTROY_TODO,
    payload: { id },
  }),

  setFilter: (filter: VisibilityFilter) => ({
    type: ActionType.SET_FILTER, //
    payload: { filter },
  }),

  clearCompleted: () => ({
    type: ActionType.CLEAR_COMPLETED, //
    payload: {},
  }),
}
