/** @jsx jsx */

import { CSSObject, jsx } from '@emotion/core'
import { Cevitxe } from 'cevitxe'
import { debug } from 'debug-deluxe'
import React, { useEffect, useState, useRef, FormEventHandler } from 'react'
import Redux from 'redux'
import createPersistedState from 'use-persisted-state'
import { wordPair } from './wordPair'
import { Formik, Field, Form, ErrorMessage } from 'formik'

//TODO ToolbarProps<T>

export const Toolbar = ({ cevitxe, onStoreReady }: ToolbarProps<any>) => {
  const useDocumentId = createPersistedState('cevitxe/documentId')
  const [appStore, setAppStore] = useAppStore(onStoreReady)
  const [documentId, setDocumentId] = useDocumentId()

  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    log('setup')
    if (appStore === undefined)
      if (documentId === undefined) create()
      else join(documentId)
  }, []) // only runs on first render

  const log = debug(`cevitxe:toolbar:${documentId}`)
  log('render')

  const create = async () => {
    if (creating || joining) return
    const newKey = wordPair()
    setDocumentId(newKey)
    setCreating(true)
    setAppStore(await cevitxe.createStore(newKey))
    setCreating(false)
    log('created store ', newKey)
    return newKey
  }
  const join = async (_documentId: string) => {
    if (creating || joining) return
    setJoining(true)
    setDocumentId(_documentId)
    setAppStore(await cevitxe.joinStore(_documentId))
    setJoining(false)
    log('joined store ', _documentId)
  }

  return (
    <div css={styles.toolbar}>
      {appStore && (
        <Formik
          initialValues={{ documentId }}
          onSubmit={(values, actions) => {
            actions.setSubmitting(false)
            join(values.documentId)
          }}
        >
          {({ isSubmitting, setFieldValue }) => (
            <Form>
              <span css={styles.toolbarGroup}>
                <Field type="text" name="documentId" css={styles.input} />
                <button role="submit" type="submit" disabled={isSubmitting} css={styles.button}>
                  Join
                </button>
              </span>
              <span css={styles.toolbarGroup}>
                <button
                  role="button"
                  onClick={async () => setFieldValue('documentId', await create())}
                  css={styles.button}
                >
                  New
                </button>
              </span>
            </Form>
          )}
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
