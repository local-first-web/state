/** @jsx jsx */
import { codes } from 'keycode'

import { css, jsx, CSSObject } from '@emotion/core'
import { Cevitxe } from 'cevitxe'
import debug from 'debug'
import { Field, Formik, FormikHelpers, FormikValues } from 'formik'
import React, { useEffect, useRef, useState } from 'react'
import Redux from 'redux'
import { wordPair } from './wordPair'
import { useQueryParam, StringParam } from 'use-query-params'

//TODO ToolbarProps<T>

export const Toolbar = ({ cevitxe, onStoreReady }: ToolbarProps<any>) => {
  // Hooks

  const [documentId, setDocumentId] = useQueryParam('id', StringParam)

  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  const [appStore, setAppStore] = useState()

  const [documentIdHasFocus, inputHasFocus] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (documentIdHasFocus && input.current) input.current.select()
  }, [documentIdHasFocus])

  useEffect(() => {
    log('setup')
    if (documentId) {
      joinStore(documentId)
    } else {
      createStore()
    }
  }, []) // only runs on first render

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

  const load = (documentId: string | undefined) => {
    if (documentId !== undefined) window.location.assign(`?id=${documentId}`)
  }

  return (
    <div css={styles.toolbar}>
      {appStore && (
        <Formik initialValues={{ documentId }} onSubmit={() => {}}>
          {({ setFieldValue, values }) => {
            const newClick = async () => {
              const newDocumentId = await createStore()
              setTimeout(() => load(newDocumentId), 200)
            }

            const inputFocus = (e: Event) => {
              if (e && e.target) {
                const input = e.target as HTMLInputElement
                input.select()
              }
              inputHasFocus(true)
            }

            const inputBlur = (e: Event) =>
              setTimeout(() => {
                inputHasFocus(false)
              }, 500)

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
                    <div css={styles.menu(documentIdHasFocus)}>
                      {cevitxe.knownDocumentIds.map(documentId => (
                        <a
                          key={documentId}
                          role="button"
                          type="button"
                          href={`?id=${documentId}`}
                          css={styles.menuItem}
                        >
                          {documentId}
                        </a>
                      ))}
                    </div>
                  </div>
                  <a
                    role="button"
                    type="button"
                    href={`?id=${values.documentId}`}
                    css={styles.button}
                  >
                    Join
                  </a>
                </div>
                <div css={styles.toolbarGroup}>
                  <button role="button" type="button" onClick={newClick} css={styles.button}>
                    New
                  </button>
                </div>
                <div css={styles.toolbarGroup}>{busy ? 'busy' : 'idle'}</div>
                <div css={styles.toolbarGroup}>{cevitxe.connectionCount}</div>
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

const styles = {
  toolbar: {
    background: '#eee',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    flexGrow: 0,
    alignItems: 'center',
    fontFamily,
    fontSize: 14,
    position: 'relative',
    zIndex: 9,
  } as CSSObject,
  button: css({
    background: 'white',
    border: '1px solid #ddd',
    color: 'black',
    padding: '.3em 1em',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily,
    fontSize: 14,
    ':hover': {
      background: 'lightBlue',
    },
    margin: '0 5px',
    borderRadius: 3,
    textDecoration: 'none',
    textTransform: 'uppercase',
  }),
  input: css({
    marginRight: 5,
    padding: '.3em 1em',
    border: '1px solid #eee',
    borderRadius: '3px',
    ['::placeholder']: {
      fontStyle: 'normal!important',
    },
    height: 16,
    width: 150,
    fontFamily,
    fontSize: 14,
  }),
  toolbarGroup: css({
    borderRight: '1px solid #eee',
    padding: 10,
  }),
  menuWrapper: css({
    position: 'relative',
    display: 'inline-block',
  }),
  menu: (documentIdHasFocus: boolean) =>
    css({
      display: documentIdHasFocus ? 'block' : 'none',
      position: 'absolute',
      background: 'white',
      top: 30,
    }),
  menuItem: css({
    background: 'white',
    color: 'black',
    lineHeight: '1',
    border: '1px solid #ddd',
    padding: '.5em 1em',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily,
    fontSize: 14,
    ':hover': {
      background: 'lightBlue',
    },
    display: 'block',
    marginTop: -2,
    width: 200,
    textDecoration: 'none',
  }),
}
