import cx from 'classnames'
import React from 'react'
import { useSelector } from 'react-redux'
import { getFilteredTodos } from 'redux/selectors'
import { VisibilityFilter } from '../types'

import { AddTodo, ClearCompletedButton, TodoList, VisibilityFilters } from '.'
import { pluralize } from '../lib/pluralize'

export function Todos() {
  const activeTodos = useSelector(getFilteredTodos(VisibilityFilter.INCOMPLETE))
  const allTodos = useSelector(getFilteredTodos(VisibilityFilter.ALL))
  const activeCount = activeTodos.length
  const hidden = allTodos.length === 0

  return (
    <div className="main">
      <section className="todoapp" style={{ flexGrow: 2 }}>
        <header className="header">
          <h1>todos</h1>
          <AddTodo />
        </header>
        <section className={cx({ main: true, hidden })}>
          <TodoList />
        </section>
        <footer className={cx({ footer: true, hidden })}>
          <span className="todo-count">
            <strong>{activeCount}</strong> {pluralize(activeCount, 'item')} left
          </span>
          <VisibilityFilters />
          <ClearCompletedButton />
        </footer>
      </section>
    </div>
  )
}
