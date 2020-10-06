import { ICellEditorParams } from 'ag-grid-community'
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

type Value = string | number | ReadonlyArray<string>

interface CellEditorHandle {
  getValue: () => Value | undefined
}

const KEY_BACKSPACE = 8
const KEY_DELETE = 46
const KEY_F2 = 113

export const CellEditor = forwardRef<CellEditorHandle, ICellEditorParams>((props, ref) => {
  const createInitialState = () => {
    let startValue = ''
    let highlightAllOnFocus = true

    if (props.keyPress === KEY_BACKSPACE || props.keyPress === KEY_DELETE) {
      // if backspace or delete pressed, we clear the cell
      startValue = ''
    } else if (props.charPress) {
      // if a letter was pressed, we start with the letter
      startValue = props.charPress
      highlightAllOnFocus = false
    } else {
      // otherwise we start with the current value
      startValue = props.value
      if (props.keyPress === KEY_F2) {
        highlightAllOnFocus = false
      }
    }

    return {
      value: startValue,
      highlightAllOnFocus,
    }
  }

  const initialState = createInitialState()

  const [value, setValue] = useState(initialState.value)
  const [highlightAllOnFocus, setHighlightAllOnFocus] = useState(initialState.highlightAllOnFocus)
  const refInput = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => {
    return {
      afterGuiAttached() {
        const eInput = refInput.current!

        eInput.focus()

        if (highlightAllOnFocus) {
          eInput.select()
          setHighlightAllOnFocus(false)
        } else {
          const length = eInput.value ? eInput.value.length : 0
          if (length > 0) eInput.setSelectionRange(length, length)
        }
      },

      getValue: () => value,
    }
  })

  useEffect(() => {
    const isLeftOrRight = (event: KeyboardEvent) => ['Left', 'Right'].includes(event.code)
    const deleteOrBackspace = (event: KeyboardEvent) => ['Delete', 'Backspace'].includes(event.code)

    const onKeyDown = (event: KeyboardEvent) => {
      if (isLeftOrRight(event) || deleteOrBackspace(event)) event.stopPropagation()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <input
      className="w-full"
      ref={refInput}
      value={value}
      onChange={event => setValue(event.target.value)}
    />
  )
})
