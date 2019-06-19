import { css } from '@emotion/core'
import React, { useState } from 'react'
import Redux from 'redux'
import { buildStore } from '../redux/store'
import { Stylesheet } from 'src/types'
import * as defaultKeys from '../secrets'

export const Toolbar = ({ onStoreReady }: ToolbarProps) => {
  const [keys, setKeys] = useState({ key: '', secret: '' })

  const keyChanged = (whichKey: string) =>
    (e =>
      setKeys({
        ...keys,
        [whichKey]: e.currentTarget.value,
      })) as React.ChangeEventHandler<HTMLInputElement>

  const useDefaultKeys = () => {
    setKeys({ key: defaultKeys.key, secret: defaultKeys.secretKey })
  }

  const reset = () => {
    onStoreReady(null)
    setKeys({ key: '', secret: '' })
  }

  const createStore = async () => {
    console.log('key', keys.key, keys.secret)
    const store = await buildStore(keys.key, keys.secret)
    setKeys({ key: store.key, secret: store.secretKey })
    onStoreReady(store.store)
  }

  return (
    <div css={styles.toolbar}>
      <span css={styles.toolbarGroup}>
        <label>Key</label>
        <input
          type="text"
          value={keys.key}
          onChange={keyChanged('key')}
          placeholder="Key"
          css={styles.input}
        />
      </span>
      <span css={styles.toolbarGroup}>
        <label>Secret</label>
        <input
          type="text"
          value={keys.secret}
          onChange={keyChanged('secret')}
          placeholder="Secret key"
          css={css(styles.input)}
        />
      </span>
      <button role="button" onClick={createStore} css={styles.button}>
        Create store
      </button>
      <button role="button" onClick={reset} css={styles.button}>
        Reset
      </button>
      <button role="button" onClick={useDefaultKeys} css={styles.button}>
        Default keys
      </button>
    </div>
  )
}
export interface ToolbarProps {
  onStoreReady: (store: Redux.Store | null) => void
}
const styles: Stylesheet = {
  toolbar: {
    position: 'fixed',
    left: 0,
    right: 0,
    top: 0,
    padding: 10,
    fontSize: 12,
    background: 'rgba(250, 250, 250, .5)',
    borderBottom: '1px solid #ddd',
  },
  button: {
    margin: '0 5px',
    border: '1px solid #aaa',
    padding: '3px 10px',
    borderRadius: 3,
  },
  input: {
    margin: '0 5px',
    padding: '3px 10px',
    border: '1px solid #eee',
    borderRadius: '3px',
    '::placeholder': {
      fontStyle: 'normal!important',
    },
  },
  toolbarGroup: {
    margin: '0 10px',
  },
}
