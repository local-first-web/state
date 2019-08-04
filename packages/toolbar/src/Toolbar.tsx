/** @jsx jsx */

import { css, jsx, CSSObject } from '@emotion/core'
import { Cevitxe } from 'cevitxe'
import debug from 'debug'
import { Field, Formik, FormikHelpers, FormikValues } from 'formik'
import React, { useEffect, useRef, useState } from 'react'
import Redux from 'redux'
import createPersistedState from 'use-persisted-state'
import { wordPair } from './wordPair'
import { useQueryParam, StringParam } from 'use-query-params'

//TODO ToolbarProps<T>

export const Toolbar = ({ cevitxe, onStoreReady }: ToolbarProps<any>) => {
  // Hooks

  // const useDocumentId = createPersistedState(`cevitxe/${cevitxe.databaseName}/documentId`)
  const [documentId, setDocumentId] = useQueryParam('id', StringParam)

  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  const [appStore, setAppStore] = useState()

  const [documentIdHasFocus, setDocumentIdHasFocus] = useState(false)
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

  return (
    <div css={styles.toolbar}>
      {appStore && (
        <Formik initialValues={{ documentId }} onSubmit={() => {}}>
          {({ setFieldValue, values }) => {
            const newClick = async () => {
              setFieldValue('documentId', await createStore())
              setTimeout(() => window.location.reload(), 200)
            }

            const joinClick = async () => {
              setDocumentIdHasFocus(false)
              joinStore(values.documentId!)
              window.location.reload()
            }

            const inputFocus = (e: Event) => {
              if (e && e.target) {
                const input = e.target as HTMLInputElement
                input.select()
              }
              setDocumentIdHasFocus(true)
            }

            const inputBlur = (e: Event) => setTimeout(() => setDocumentIdHasFocus(false), 500)

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
                  <button role="button" type="button" onClick={joinClick} css={styles.button}>
                    Join
                  </button>
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
