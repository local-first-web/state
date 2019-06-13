import { ActionType } from './actions'
import { Dispatch } from 'react'

export interface Todo {
  id: string
  content: string
  completed: boolean
}

export interface State {
  todoList: string[]
  todoMap: { [id: string]: Todo }
  visibilityFilter: VisibilityFilter
}

export interface Action {
  type: ActionType
  payload: any
}

export enum VisibilityFilter {
  ALL = 'All',
  INCOMPLETE = 'Active',
  COMPLETED = 'Completed',
}

export type VisibilityFilterKey = keyof typeof VisibilityFilter

export interface ContextInterface {
  state: State
  dispatch: Dispatch<Action>
}
