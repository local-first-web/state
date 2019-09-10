/** @jsx jsx */
import { CSSObject, jsx } from '@emotion/core'
import { StoreManager } from 'cevitxe'
import debug from 'debug'
import { Field, Formik } from 'formik'
import { codes } from 'keycode'
import React, { useEffect, useRef, useState } from 'react'
import Redux from 'redux'
import { StringParam, useQueryParam } from 'use-query-params'
import { wordPair } from './wordPair'

export const Toolbar = ({ storeManager, onStoreReady }: ToolbarProps<any>) => {
  // Hooks
  const [discoveryKey, setdiscoveryKey] = useQueryParam('id', StringParam)
  const [, setAppStore] = useState()
  const [inputHasFocus, setInputHasFocus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('idle')

  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  // join or create store
  useEffect(() => {
    log('setup')
    if (discoveryKey) joinStore(discoveryKey)
    else createStore()
  }, []) // only runs on first render

  // select on focus
  useEffect(() => {
    if (inputHasFocus && input.current) input.current.select()
  }, [inputHasFocus])

  const log = debug(`cevitxe:toolbar:${discoveryKey}`)
  log('render')

  // Handlers

  const createStore = async () => {
    setBusy(true)
    setStatus('creating store')
    const newDiscoveryKey = wordPair()
    setdiscoveryKey(newDiscoveryKey)
    const newStore = await storeManager.createStore(newDiscoveryKey)
    setAppStore(newStore)
    onStoreReady(newStore)
    setBusy(false)
    setStatus('idle')
    log('created store', newDiscoveryKey)
    return newDiscoveryKey
  }

  const joinStore = async (newDiscoveryKey: string) => {
    if (busy) return
    setBusy(true)
    setStatus('joining store')
    setdiscoveryKey(newDiscoveryKey)
    const newStore = await storeManager.joinStore(newDiscoveryKey)
    setAppStore(newStore)
    onStoreReady(newStore)
    setBusy(false)
    setStatus('idle')
    log('joined store', newDiscoveryKey)
  }

  const url = (discoveryKey: string = '') =>
    `${location.protocol}//${location.host}/?id=${discoveryKey}`

  // Loads a discoveryKey by navigating to its URL
  const load = (discoveryKey: string | undefined) => {
    if (discoveryKey !== undefined) window.location.assign(url(discoveryKey))
  }

  return (
    <div css={styles.toolbar}>
      <Formik initialValues={{ discoveryKey }} onSubmit={() => load(discoveryKey)}>
        {({ values }) => {
          const newClick = async () => {
            const newDiscoveryKey = await createStore()
            setTimeout(() => load(newDiscoveryKey), 200)
          }

          const inputFocus = (e: Event) => {
            if (e && e.target) {
              const input = e.target as HTMLInputElement
              input.select()
            }
            setInputHasFocus(true)
          }

          // when the input loses focus, we need to wait a moment before hiding the menu
          // in case the blur was caused by clicking on a menu item
          const inputBlur = (e: Event) => setTimeout(() => setInputHasFocus(false), 100)

          const keyDown = (event: KeyboardEvent) => {
            if (event) {
              switch (event.which) {
                case codes['enter']:
                case codes['tab']:
                  load(values.discoveryKey)
              }
            }
          }
          return (
            <React.Fragment>
              <div css={styles.toolbarGroup}>
                <div css={styles.menuWrapper}>
                  <Field
                    type="text"
                    name="discoveryKey"
                    css={styles.input}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    onKeyDown={keyDown}
                  />
                  <div css={menu(inputHasFocus)}>
                    {storeManager.knownDiscoveryKeys.map(discoveryKey => (
                      <a
                        key={discoveryKey}
                        role="button"
                        type="button"
                        href={url(discoveryKey)}
                        css={styles.menuItem}
                      >
                        {discoveryKey}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <a role="button" type="button" href={url(values.discoveryKey)} css={styles.button}>
                  Join
                </a>
              </div>
              <div css={styles.toolbarGroup}>
                <button role="button" type="button" onClick={newClick} css={styles.button}>
                  New
                </button>
              </div>
              <div css={styles.toolbarGroup}>
                <label>{status}</label>
              </div>
              <div css={styles.toolbarGroup}>
                <label>{storeManager.connectionCount}</label>
              </div>
            </React.Fragment>
          )
        }}
      </Formik>
    </div>
  )
}

export interface ToolbarProps<T> {
  storeManager: StoreManager<T>
  onStoreReady: (store: Redux.Store) => void
}

const fontFamily = 'inconsolata, monospace'
const button: CSSObject = {
  background: 'white',
  border: '1px solid #ddd',
  boxSizing: 'border-box',
  color: 'black',
  cursor: 'pointer',
  display: 'block',
  fontFamily,
  fontSize: 14,
  ':hover': {
    background: 'lightBlue',
  },
  height: 30,
  lineHeight: 1,
  padding: '6px 15px',
  textDecoration: 'none',
}

export const menu = (discoveryKeyHasFocus: boolean): CSSObject => ({
  display: discoveryKeyHasFocus ? 'block' : 'none',
  position: 'absolute',
  background: 'white',
  top: 30,
})

export const styles: Stylesheet = {
  toolbar: {
    background: '#eee',
    borderBottom: '1px solid #ddd',
    lineHeight: '1',
    display: 'flex',
    flexGrow: 0,
    alignItems: 'center',
    fontFamily,
    fontSize: 14,
    position: 'relative',
    zIndex: 9,
  },
  button: {
    ...button,
    textAlign: 'left',
    margin: '0 5px',
    borderRadius: 3,
    textTransform: 'uppercase',
  },
  input: {
    boxSizing: 'border-box',
    marginRight: 5,
    padding: '6px 15px',
    border: '1px solid #eee',
    borderRadius: '3px',
    ['::placeholder']: {
      fontStyle: 'normal!important',
    },
    height: 30,
    width: 175,
    fontFamily,
    fontSize: 14,
  },
  toolbarGroup: {
    borderRight: '1px solid #ddd',
    padding: 3,
    height: 30,
    minWidth: 40,
    textAlign: 'center',
    display: 'flex',
    label: {
      margin: 'auto',
      padding: '0 1em',
    },
  },
  menuWrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  menuItem: {
    ...button,
    display: 'block',
    textAlign: 'left',
    marginTop: -2,
    width: 200,
    position: 'relative',
    zIndex: 99,
  },
}

type Stylesheet = { [k: string]: CSSObject | ((...args: any[]) => CSSObject) }
