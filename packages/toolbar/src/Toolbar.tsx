/** @jsx jsx */
import { css, CSSObject, jsx } from '@emotion/core'
import { Cevitxe } from 'cevitxe'
import debug from 'debug'
import { Field, Formik } from 'formik'
import { codes } from 'keycode'
import React, { useEffect, useRef, useState } from 'react'
import Redux from 'redux'
import { StringParam, useQueryParam } from 'use-query-params'
import { wordPair } from './wordPair'

//TODO ToolbarProps<T>

export const Toolbar = ({ cevitxe, onStoreReady }: ToolbarProps<any>) => {
  // Hooks

  const [documentId, setDocumentId] = useQueryParam('id', StringParam)
  const [appStore, setAppStore] = useState()
  const [inputHasFocus, setInputHasFocus] = useState(false)
  const [busy, setBusy] = useState(false)

  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  // join or create store
  useEffect(() => {
    log('setup')
    if (documentId) joinStore(documentId)
    else createStore()
  }, []) // only runs on first render

  // select on focus
  useEffect(() => {
    if (inputHasFocus && input.current) input.current.select()
  }, [inputHasFocus])

  const log = debug(`cevitxe:toolbar:${documentId}`)
  log('render')

  // Handlers

  const createStore = async () => {
    setBusy(true)
    const newDocumentId = wordPair()
    setDocumentId(newDocumentId)
    const newStore = await cevitxe.createStore(newDocumentId)
    setAppStore(newStore)
    onStoreReady(newStore)
    setBusy(false)
    log('created store', newDocumentId)
    return newDocumentId
  }

  const joinStore = async (newDocumentId: string) => {
    if (busy) return
    setBusy(true)
    setDocumentId(newDocumentId)
    const newStore = await cevitxe.joinStore(newDocumentId)
    setAppStore(newStore)
    onStoreReady(newStore)
    setBusy(false)
    log('joined store', newDocumentId)
  }

  const url = (documentId: string = '') =>
    `${location.protocol}//${location.host}/?id=${documentId}`

  // Loads a documentId by navigating to its URL
  const load = (documentId: string | undefined) => {
    if (documentId !== undefined) window.location.assign(url(documentId))
  }

  return (
    <div css={styles.toolbar}>
      {appStore && (
        <Formik initialValues={{ documentId }} onSubmit={() => load(documentId)}>
          {({ values }) => {
            const newClick = async () => {
              const newDocumentId = await createStore()
              setTimeout(() => load(newDocumentId), 200)
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
                    load(values.documentId)
                }
              }
            }
            return (
              <React.Fragment>
                <div css={styles.toolbarGroup}>
                  <div css={styles.menuWrapper}>
                    <Field
                      type="text"
                      name="documentId"
                      css={styles.input}
                      onFocus={inputFocus}
                      onBlur={inputBlur}
                      onKeyDown={keyDown}
                    />
                    <div css={menu(inputHasFocus)}>
                      {cevitxe.knownDocumentIds.map(documentId => (
                        <a
                          key={documentId}
                          role="button"
                          type="button"
                          href={url(documentId)}
                          css={styles.menuItem}
                        >
                          {documentId}
                        </a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <a
                      role="button"
                      type="button"
                      href={url(values.documentId)}
                      css={styles.button}
                    >
                      Join
                    </a>
                  </div>
                </div>
                <div css={styles.toolbarGroup}>
                  <button role="button" type="button" onClick={newClick} css={styles.button}>
                    New
                  </button>
                </div>
                <div css={styles.toolbarGroup}>
                  <label>{busy ? 'busy' : 'idle'}</label>
                </div>
                <div css={styles.toolbarGroup}>
                  <label>{cevitxe.connectionCount}</label>
                </div>
              </React.Fragment>
            )
          }}
        </Formik>
      )}
    </div>
  )
}

export interface ToolbarProps<T> {
  cevitxe: Cevitxe<T>
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
  textTransform: 'uppercase',
}

const menu = (documentIdHasFocus: boolean): CSSObject => ({
  display: documentIdHasFocus ? 'block' : 'none',
  position: 'absolute',
  background: 'white',
  top: 30,
})

const styles: Stylesheet = {
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
    padding: 10,
    height: 30,
    minWidth: 40,
    textAlign: 'center',
    display: 'flex',
    label: {
      margin: 'auto',
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
  },
}

type Stylesheet = { [k: string]: CSSObject | ((...args: any[]) => CSSObject) }
