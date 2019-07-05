/** @jsx jsx */

import { jsx } from '@emotion/core'
import debug from 'debug'
import React, { useState } from 'react'
import Redux from 'redux'
import createPersistedState from 'use-persisted-state'
import uuid from 'uuid'
import { cevitxe } from '../redux/store'
import { Stylesheet } from '../types'

const log = debug('cevitxe:grid:toolbar')
const useDiscoveryKey = createPersistedState('cevitxe/grid/documentId')

export const Toolbar = ({ onStoreReady }: ToolbarProps) => {
  const [appStore, setAppStore] = useAppStore(onStoreReady)
  const [documentId, setDiscoveryKey] = useDiscoveryKey()

  const keyChanged = (e: React.ChangeEvent<HTMLInputElement>) =>
    setDiscoveryKey(e.currentTarget.value)

  const create = async () => {
    // TODO: Call to disconnect to ensure we've closed all existing connections?
    const newKey = uuid()
    setDiscoveryKey(newKey)
    setAppStore(await cevitxe.createStore(newKey))
    log('created store ', newKey)
  }

  const join = async () => {
    // TODO: Call to disconnect to ensure we've closed all existing connections?
    setAppStore(await cevitxe.joinStore(documentId))
    log('joined store ', documentId)
  }

  // const disconnect = () => {
  //   // TODO: Disconnect from signalhub and all peers
  //   setAppStore(undefined)
  // }

  if (appStore === undefined)
    if (documentId === undefined) create()
    else join()

  return (
    <div css={styles.toolbar}>
      <span css={styles.toolbarGroup}>
        <input
          type="text"
          value={documentId}
          onChange={keyChanged}
          placeholder="Key"
          css={styles.input}
          // disabled={appStore !== undefined}
        />
        <button
          role="button"
          onClick={join}
          css={styles.button}
          // disabled={appStore !== undefined}
        >
          Join list
        </button>
      </span>
      or
      <span css={styles.toolbarGroup}>
        <button
          role="button"
          onClick={create}
          css={styles.button}
          // disabled={appStore !== undefined}
        >
          New list
        </button>
      </span>
      {/* {appStore && (
        <button role="button" onClick={disconnect} css={styles.button}>
          Disconnect
        </button>
      )} */}
    </div>
  )
}

export interface ToolbarProps {
  onStoreReady: (store?: Redux.Store) => void
}

const useAppStore = (cb: (store?: Redux.Store) => void) => {
  const [appStore, _setAppStore] = useState()
  const setAppStore = (store?: Redux.Store) => {
    _setAppStore(store)
    cb(store)
  }
  return [appStore, setAppStore]
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
    fontFamily: 'inconsolata, monospace',
    margin: '0 5px',
    padding: '3px 10px',
    border: '1px solid #eee',
    borderRadius: '3px',
    '::placeholder': {
      fontStyle: 'normal!important',
    },
    width: '275px',
  },
  toolbarGroup: {
    margin: '0 10px',
  },
}
