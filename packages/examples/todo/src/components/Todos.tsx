import cx from 'classnames'
import React from 'react'
import { useSelector } from 'react-redux'
import { getFilteredTodos } from 'src/redux/selectors'
import { VisibilityFilter } from 'src/types'

import { AddTodo, ClearCompletedButton, TodoList, VisibilityFilters } from '../components'
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
      <footer className="info">
        <p>Double-click to edit a todo</p>
        <p>
          Created by <a href="http://github.com/herbcaudill/">Herb Caudill</a>
        </p>
        <p>
          Maybe at some point part of <a href="http://todo.com">TodoMVC</a>
        </p>
      </footer>
    </div>
  )
}
