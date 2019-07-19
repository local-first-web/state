/** @jsx jsx */

import { CSSObject, jsx } from '@emotion/core'
import { Cevitxe } from 'cevitxe'
import debug from 'debug'
import { Field, Formik, FormikHelpers, FormikValues } from 'formik'
import { useEffect, useState, useRef } from 'react'
import Redux from 'redux'
import createPersistedState from 'use-persisted-state'
import { wordPair } from './wordPair'
import React from 'react'

//TODO ToolbarProps<T>

export const Toolbar = ({ cevitxe, onStoreReady }: ToolbarProps<any>) => {
  const useDocumentId = createPersistedState(`cevitxe/${cevitxe.databaseName}/documentId`)
  const [documentId, setDocumentId] = useDocumentId()
  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  const [appStore, setAppStore] = useAppStore(onStoreReady)

  const [documentIdHasFocus, setDocumentIdHasFocus] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (documentIdHasFocus && input.current) input.current.select()
  }, [documentIdHasFocus])

  useEffect(() => {
    log('setup')
    if (documentId) join(documentId)
    else create()
  }, []) // only runs on first render

  const log = debug(`cevitxe:toolbar:${documentId}`)
  log('render')

  const create = async () => {
    setBusy(true)
    const newDocumentId = wordPair()
    setDocumentId(newDocumentId)
    setAppStore(await cevitxe.createStore(newDocumentId))
    setBusy(false)
    log('created store ', newDocumentId)
    join(newDocumentId)
    return newDocumentId
  }

  const join = async (_documentId: string) => {
    if (busy) return
    setBusy(true)
    setDocumentId(_documentId)
    setAppStore(await cevitxe.joinStore(_documentId))
    setBusy(false)
    log('joined store ', _documentId)
  }

  const onSubmit = (values: FormikValues, actions: FormikHelpers<any>) => {
    join(values.documentId)
    actions.setSubmitting(false)
  }

  const documentIds = cevitxe.knownDocumentIds

  return (
    <div css={styles.toolbar}>
      {appStore && (
        <Formik initialValues={{ documentId }} onSubmit={onSubmit}>
          {({ setFieldValue, values }) => {
            const onClickNew = async () => setFieldValue('documentId', await create())
            const onClickJoin = async () => {
              setDocumentIdHasFocus(false)
              join(values.documentId)
            }
            const onFocus = (e: Event) => {
              if (e && e.target) {
                const input = e.target as HTMLInputElement
                input.select()
              }
              setDocumentIdHasFocus(true)
            }
            return (
              <React.Fragment>
                <div css={styles.toolbarGroup}>
                  <div css={styles.dropdownWrapper}>
                    <Field
                      type="text"
                      name="documentId"
                      css={styles.input}
                      onFocus={onFocus}
                      // onBlur={onClickJoin}
                    />
                    <div
                      css={{ ...styles.dropdown, display: documentIdHasFocus ? 'block' : 'none' }}
                    >
                      {documentIds.map(documentId => (
                        <button
                          key={documentId}
                          role="button"
                          type="button"
                          onClick={() => {
                            setFieldValue('documentId', documentId)
                            setDocumentId(documentId)
                            join(documentId)
                            setDocumentIdHasFocus(false)
                          }}
                          css={styles.dropdownElement}
                        >
                          {documentId}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button role="button" type="button" onClick={onClickJoin} css={styles.button}>
                    Join
                  </button>
                </div>
                <div css={styles.toolbarGroup}>
                  <button role="button" type="button" onClick={onClickNew} css={styles.button}>
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
    background: 'rgba(250, 250, 250, .5)',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    flexGrow: 0,
    alignItems: 'center',
    fontFamily: 'inconsolata, monospace',
    fontSize: 14,
  },
  button: {
    margin: '0 5px',
    border: '1px solid #ddd',
    padding: '.3em 1em',
    borderRadius: 3,
    textTransform: 'uppercase',
    cursor: 'pointer',
    fontSize: 14,
  },
  input: {
    marginRight: 5,
    padding: '.3em 1em',
    border: '1px solid #eee',
    borderRadius: '3px',
    ['::placeholder']: {
      fontStyle: 'normal!important',
    },
    height: 16,
    width: 150,
    fontFamily: 'inconsolata, monospace',
    fontSize: 14,
  },
  toolbarGroup: {
    borderRight: '1px solid #eee',
    padding: 10,
  },
  dropdownWrapper: {
    position: 'relative',
    display: 'inline-block',
  },
  dropdown: {
    position: 'absolute',
    background: 'white',
    top: 30,
  },
  dropdownElement: {
    display: 'block',
    border: '1px solid #ddd',
    marginTop: -2,
    width: 200,
    height: 30,
    padding: '.3em 1em',
    textAlign: 'left',
    cursor: 'pointer',
  },
}
