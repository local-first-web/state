/** @jsx jsx */

import { css, jsx } from '@emotion/core'
import React, { useState } from 'react'
import Redux from 'redux'
import { Stylesheet } from 'src/types'
import createPersistedState from 'use-persisted-state'
import { createStore, joinStore } from '../redux/store'
import uuid from 'uuid'

const useDiscoveryKey = createPersistedState('cevitxe/discoverykey')

export const Toolbar = ({ onStoreReady }: ToolbarProps) => {
  const [discoveryKey, setDiscoveryKey] = useDiscoveryKey<string>('')
  const [appStore, setAppStore] = useState<Redux.Store | null>(null)

  const keyChanged = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDiscoveryKey(e.currentTarget.value)

  const create = async () => {
    const newKey = uuid()
    setDiscoveryKey(newKey)
    const store = await createStore(newKey)
    console.log('created feed ', newKey)
    setAppStore(store)
    onStoreReady(store)
  }

  const join = async () => {
    const store = await joinStore(discoveryKey)
    console.log('joined feed ', discoveryKey)
    setAppStore(store)
    onStoreReady(store)
  }

  const disconnect = () => {
    setAppStore(null)
    onStoreReady(null)
  }

  return (
    <div css={styles.toolbar}>
      <span css={styles.toolbarGroup}>
        {' '}
        <button
          role="button"
          onClick={create}
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
          onClick={join}
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
