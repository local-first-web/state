/** @jsx jsx */

import { jsx, css, CSSObject } from '@emotion/core'
import React, { useState, CSSProperties } from 'react'
import { Provider } from 'react-redux'
import App from './App'
import { buildStore } from '../redux/store'
import * as defaultKeys from '../secrets'
import { Store, AnyAction } from 'redux'

export const Shell = () => {
  const [appStore, setAppStore] = useState()
  const [keys, setKeys] = useState({ key: '', secret: '' })

  const keyChanged = (name: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => setKeys({ ...keys, [name]: e.currentTarget.value })

  const useDefaultKeys = () => {
    setKeys({ key: defaultKeys.key, secret: defaultKeys.secretKey })
  }

  const reset = () => {
    setAppStore(null)
    setKeys({ key: '', secret: '' })
  }

  const createStore = async () => {
    console.log('key', keys.key, keys.secret)
    const store = await buildStore(keys.key, keys.secret) //.then((store: CevitxeStore) => {
    setAppStore(store.store)
    setKeys({ key: store.key, secret: store.secretKey })
    //})
  }

  return (
    <div>
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
      {appStore && (
        <Provider store={appStore}>
          <App />
        </Provider>
      )}
    </div>
  )
}

type Stylesheet = { [k: string]: CSSObject }

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
