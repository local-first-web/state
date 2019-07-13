/** @jsx jsx */

import { CSSObject, jsx } from '@emotion/core'
import { Cevitxe } from 'cevitxe'
import { debug } from 'debug-deluxe'
import React, { useEffect, useState } from 'react'
import Redux from 'redux'
import createPersistedState from 'use-persisted-state'
import { wordPair } from './wordPair'

const log = debug('cevitxe:toolbar')

//TODO ToolbarProps<T>

export const Toolbar = ({ cevitxe, onStoreReady }: ToolbarProps<any>) => {
  const useDocumentId = createPersistedState('cevitxe/documentId')
  const [appStore, setAppStore] = useAppStore(onStoreReady)
  const [documentId, setDocumentId] = useDocumentId()

  log('render')

  useEffect(() => {
    log('setup')
    if (appStore === undefined)
      if (documentId === undefined) create()
      else join()
  }, []) // only runs on first render

  const create = async () => {
    const newKey = wordPair() //uuid()
    setDocumentId(newKey)
    setAppStore(await cevitxe.createStore(newKey))
    log('created store ', newKey)
  }
  const join = async () => {
    setAppStore(await cevitxe.joinStore(documentId))
    log('joined store ', documentId)
  }

  const keyChanged = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocumentId(e.currentTarget.value)
    join()
  }

  return (
    <div>
      {appStore && (
        <div css={styles.toolbar}>
          <span css={styles.toolbarGroup}>
            <input
              type="text"
              value={documentId}
              onChange={keyChanged}
              placeholder="Key"
              css={styles.input}
            />
            <button role="button" onClick={join} css={styles.button}>
              Join list
            </button>
          </span>
          or
          <span css={styles.toolbarGroup}>
            <button role="button" onClick={create} css={styles.button}>
              New list
            </button>
          </span>
        </div>
      )}
    </div>
  )
}

export interface ToolbarProps<T> {
  cevitxe: Cevitxe<T>
  onStoreReady: (store: Redux.Store) => void
}

const useAppStore = (cb: (store: Redux.Store) => void) => {
  const [appStore, _setAppStore] = useState()
  const setAppStore = (store: Redux.Store) => {
    _setAppStore(store)
    cb(store)
  }
  return [appStore, setAppStore]
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
