import { ActionType } from './redux/actions'
import { CSSObject } from '@emotion/core'

export interface Todo {
  id: string
  content: string
  completed: boolean
}

export interface Action {
  type: ActionType
  payload: any
}

export interface State {
  todoList: string[]
  todoMap: { [id: string]: Todo }
  visibilityFilter: VisibilityFilter
}

export enum VisibilityFilter {
  ALL = 'All',
  INCOMPLETE = 'Active',
  COMPLETED = 'Completed',
}

export type VisibilityFilterKey = keyof typeof VisibilityFilter

export type Stylesheet = { [k: string]: CSSObject }
