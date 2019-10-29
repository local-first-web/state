/** @jsx jsx */
import React, { useRef, FormEventHandler } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, jsx } from '@emotion/core'
import { addChatMessage } from '../store/reducer'
import { OnlineIndicator } from './OnlineIndicator'
import { State } from 'cevitxe-types'

export const Chat = () => {
  const dispatch = useDispatch()
  const messages = useSelector<State, string[]>(state => {
    if (!state || !state.messages) return []
    return state.messages
  })
  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>
  const save: FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault()
    if (input && input.current) {
      const newText = input.current.value.trim()
      if (newText.length === 0) return
      dispatch(addChatMessage(newText))
      input.current.value = ''
    }
  }

  return (
    <div css={wrapper}>
      <div css={chatPane}>
        <div css={chatHeaderPane}>
          <h3 css={chatHeader}>Chat log</h3>
          <OnlineIndicator />
        </div>
        <div css={chatLog}>
          {messages.map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
      </div>
      <form onSubmit={save} css={inputPane}>
        <input
          type="text"
          id="message"
          name="message"
          ref={input}
          css={textbox}
          autoComplete="off"
          placeholder="Type a message then press Enter..."
        />
      </form>
    </div>
  )
}

const wrapper = css`
  display: flex;
  flex: 1;
  flex-direction: column;
`
const chatHeaderPane = css`
  display: flex;
  justify-item-self: flex-start;
  flex-direction: row;
  alight-content: center;
`

const chatHeader = css`
  display: flex;
  flex: 1;
  justify-item-self: flex-start;
  margin: 8px 0 0 4px;
`

const chatPane = css`
  display: flex;
  flex: 1;
  flex-grow: 1;
  flex-direction: column;
`

const chatLog = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-end;
  padding: 2px 4px;
  overflow-y: auto;
`

const inputPane = css`
  display: flex;
  flex-basis: 34px;
  align-content: stretch;
`

const textbox = css`
  display: flex;
  flex: 1;
  border-top: solid 2px black;
  padding: 2px 4px;
`
