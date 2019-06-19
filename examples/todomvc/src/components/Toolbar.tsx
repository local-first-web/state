/** @jsx jsx */

import { css, jsx } from '@emotion/core'
import React, { useState } from 'react'
import Redux from 'redux'
import { Stylesheet } from 'src/types'
import createPersistedState from 'use-persisted-state'
import { buildStore } from '../redux/store'
import uuid from 'uuid'

const useDiscoveryKey = createPersistedState('cevitxe/discoverykey')

export const Toolbar = ({ onStoreReady }: ToolbarProps) => {
  const [discoveryKey, setDiscoveryKey] = useDiscoveryKey<string>('')
  const [appStore, setAppStore] = useState<any>(null)

  const keyChanged = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDiscoveryKey(e.currentTarget.value)

  const createStore = async () => {
    const newKey = uuid()
    setDiscoveryKey(newKey)
    setAppStore('foo')
    console.log('created feed ', newKey)
    //   const store = await buildStore(discoveryKey)
    //   onStoreReady(store)
  }

  const joinStore = async () => {
    setAppStore('foo')
    console.log('joining ', discoveryKey)
  }

  const disconnect = () => {
    setAppStore(null)
  }

  return (
    <div css={styles.toolbar}>
      <span css={styles.toolbarGroup}>
        {' '}
        <button
          role="button"
          onClick={createStore}
          css={styles.button}
          disabled={appStore !== null}
        >
          Create Feed
        </button>
      </span>
      or
      <span css={styles.toolbarGroup}>
        <label>Key</label>
        <input
          type="text"
          value={discoveryKey}
          onChange={keyChanged}
          placeholder="Key"
          css={styles.input}
          disabled={appStore !== null}
        />
        <button
          role="button"
          onClick={joinStore}
          css={styles.button}
          disabled={appStore !== null}
        >
          Join
        </button>
      </span>
      {appStore && (
        <button role="button" onClick={disconnect} css={styles.button}>
          Disconnect
        </button>
      )}
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
    width: '400px',
  },
  toolbarGroup: {
    margin: '0 10px',
  },
}
