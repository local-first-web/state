import React, { useContext } from 'react'
import { StoreContext } from 'src/context'
import { Todo } from '.'
import { getVisibleTodos } from '../selectors'

export const TodoList = () => {
  const { state } = useContext(StoreContext)

  const todos = getVisibleTodos(state)

  return (
    <ul className="todo-list">
      {todos && todos.map(todo => <Todo key={`todo-${todo.id}`} {...todo} />)}
    </ul>
  )
}
