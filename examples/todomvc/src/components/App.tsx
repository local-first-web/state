import cn from 'classnames'
import React from 'react'
import { useSelector } from 'react-redux'

import { getFilteredTodos } from '../redux/selectors'
import { AddTodo, TodoList, VisibilityFilters, ClearCompletedButton } from '.'
import { pluralize } from '../lib/pluralize'
import { VisibilityFilter } from '../types'

export default function App() {
  const activeTodos = useSelector(getFilteredTodos(VisibilityFilter.INCOMPLETE))
  const allTodos = useSelector(getFilteredTodos(VisibilityFilter.ALL))
  const activeCount = activeTodos.length
  const hidden = allTodos.length === 0

  return (
    <div>
      <header className="header">
        <h1>todos</h1>
        <AddTodo />
      </header>
      <section className={cn({ main: true, hidden })}>
        <TodoList />
      </section>
      <footer className={cn({ footer: true, hidden })}>
        <span className="todo-count">
          <strong>{activeCount}</strong> {pluralize(activeCount, 'item')} left
        </span>
        <VisibilityFilters />
        <ClearCompletedButton />
      </footer>
    </div>
  )
}
