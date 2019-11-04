import React from 'react'
import { useSelector } from 'react-redux'

import { Todo } from '../components'
import { getVisibleTodos } from '../redux/selectors'

export const TodoList = () => {
  const todos = useSelector(getVisibleTodos)

  return (
    <ul className="todo-list">
      {todos && todos.map(todo => <Todo key={`todo-${todo.id}`} {...todo} />)}
    </ul>
  )
}
