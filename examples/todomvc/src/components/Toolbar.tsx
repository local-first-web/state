/** @jsx jsx */

import { css, jsx } from '@emotion/core'
import React from 'react'
import Redux from 'redux'
import { Stylesheet } from 'src/types'
import createPersistedState from 'use-persisted-state'
import { buildStore } from '../redux/store'
import uuid from 'uuid'

const useDiscoveryKey = createPersistedState('cevitxe/discoverykey')

export const Toolbar = ({ onStoreReady }: ToolbarProps) => {
  let [discoveryKey, setDiscoveryKey] = useDiscoveryKey<string>(uuid())

  type RCEH = React.ChangeEventHandler<HTMLInputElement>
  // const keyChanged = (e => setDiscoveryKey(e.currentTarget.value)) as RCEH

  // const createStore = async () => {
  //   const store = await buildStore(discoveryKey)
  //   onStoreReady(store.store)
  // }

  return (
    <div css={styles.toolbar}>
      <span css={styles.toolbarGroup}>
        <label>Key</label>
        <input
          type="text"
          defaultValue={discoveryKey}
          // onChange={keyChanged}
          placeholder="Key"
          css={styles.input}
        />
      </span>

      {/* <button role="button" onClick={createStore} css={styles.button}>
        Create store
      </button> */}
      {/* <button role="button" onClick={reset} css={styles.button}>
        Reset
      </button> */}
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
