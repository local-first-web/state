import cx from 'classnames'
import React, { useContext } from 'react'

import { getFilteredTodos } from '../selectors'
import { AddTodo, TodoList, VisibilityFilters, ClearCompletedButton } from '.'
import { pluralize } from '../lib/pluralize'
import { VisibilityFilter } from '../types'
import { StoreContext } from 'src/context'

export default function App() {
  const { state } = useContext(StoreContext)

  const activeTodos = getFilteredTodos(VisibilityFilter.INCOMPLETE)(state)
  const allTodos = getFilteredTodos(VisibilityFilter.ALL)(state)
  const activeCount = activeTodos.length
  const hidden = allTodos.length === 0

  return (
    <div>
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
    </div>
  )
}
