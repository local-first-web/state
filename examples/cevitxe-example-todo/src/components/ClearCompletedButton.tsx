import React from 'react'
import { useSelector } from 'react-redux'
import { useDispatch } from 'react-redux'

import { actions } from '../redux/actions'
import { getFilteredTodos } from '../redux/selectors'
import { VisibilityFilter } from '../types'

export function ClearCompletedButton() {
  const dispatch = useDispatch()

  // don't render this button if there are no completed todos
  const completedTodos = useSelector(getFilteredTodos(VisibilityFilter.COMPLETED))
  if (completedTodos.length === 0) return null

  const clearCompleted = () => dispatch(actions.clearCompleted())

  return (
    <button className="clear-completed" onClick={clearCompleted}>
      Clear completed
    </button>
  )
}
