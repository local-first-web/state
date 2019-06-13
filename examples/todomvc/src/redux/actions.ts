import uuid from 'uuid'
import { VisibilityFilter } from '../types'

export const ADD_TODO = 'ADD_TODO'
export const addTodo = (content: string) => ({
  type: ADD_TODO,
  payload: { content, id: uuid() },
})

export const TOGGLE_TODO = 'TOGGLE_TODO'
export const toggleTodo = (id: string) => ({
  type: TOGGLE_TODO,
  payload: { id },
})

export const EDIT_TODO = 'EDIT_TODO'
export const editTodo = (id: string, content: string) => ({
  type: EDIT_TODO,
  payload: { id, content },
})

export const DESTROY_TODO = 'DESTROY_TODO'
export const destroyTodo = (id: string) => ({
  type: DESTROY_TODO,
  payload: { id },
})

export const SET_FILTER = 'SET_FILTER'
export const setFilter = (filter: VisibilityFilter) => ({
  type: SET_FILTER, //
  payload: { filter },
})
