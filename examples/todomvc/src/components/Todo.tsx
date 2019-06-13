import cx from 'classnames'
import React, {
  FormEventHandler,
  KeyboardEventHandler,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { StoreContext } from 'src/context'
import { actions } from '../actions'
import { Todo as TodoType } from '../types'

const { editTodo, destroyTodo, toggleTodo } = actions

const ENTER_KEY = 13
const ESCAPE_KEY = 27

export const Todo = ({ id, completed, content }: TodoType) => {
  const { dispatch } = useContext(StoreContext)

  // component state
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)

  // input.current will contain a reference to the editing input
  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  // side effect: need to select all content in the input when going into editing mode
  // this will only fire when `editing` changes
  useEffect(() => {
    if (editing && input.current) input.current.select()
  }, [editing])

  // we save when the user has either tabbed or clicked away, or hit Enter
  const save: FormEventHandler<HTMLInputElement> = (
    e: React.FormEvent<HTMLInputElement>
  ) => {
    const saveContent = (e.target as HTMLInputElement).value.trim()
    if (saveContent.length > 0) {
      // todo was changed - keep the edited content
      dispatch(editTodo(id, saveContent))
    } else {
      // user has removed all the content of the todo, so delete it
      dispatch(destroyTodo(id))
    }
    leaveEditMode()
  }

  // listen for special keys
  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.keyCode === ESCAPE_KEY) {
      // ESC: abort editing
      restoreContent()
      leaveEditMode()
    } else if (e.keyCode === ENTER_KEY) {
      // ENTER: persist the edited content
      save(e)
    }
  }

  const enterEditMode = () => setEditing(true)
  const leaveEditMode = () => setEditing(false)

  const updateContent: FormEventHandler<HTMLInputElement> = e =>
    setEditContent((e.target as HTMLInputElement).value)
  const restoreContent = () => setEditContent(content)

  return (
    <li className={cx({ completed, editing })}>
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={completed}
          onChange={() => dispatch(toggleTodo(id))}
        />
        <label onDoubleClick={enterEditMode}>{content}</label>
        <button
          className="destroy"
          style={{ cursor: 'pointer' }}
          onClick={() => dispatch(destroyTodo(id))}
        />
      </div>

      <input
        className="edit"
        ref={input}
        value={editContent}
        onBlur={save}
        onChange={updateContent}
        onKeyDown={onKeyDown}
      />
    </li>
  )
}
