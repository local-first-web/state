import React, { useRef, FormEventHandler } from 'react'
import { useDispatch } from 'react-redux'
import { actions } from '../redux/actions'

export const AddTodo = () => {
  // input.current will contain a reference to the new todo input field
  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  const dispatch = useDispatch()

  const save: FormEventHandler<HTMLFormElement> = e => {
    // don't post back
    e.preventDefault()
    if (input && input.current) {
      const newText = input.current.value.trim()
      // don't create empty todos
      if (newText.length === 0) return
      // update state with new todo
      dispatch(actions.addTodo(newText))
      // clear input
      input.current.value = ''
    }
  }

  return (
    <div>
      <form onSubmit={save}>
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          ref={input}
          autoFocus={true}
        />
      </form>
    </div>
  )
}
