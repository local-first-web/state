/** @jsx jsx */
import { jsx } from '@emotion/core'
import { StoreManager } from 'cevitxe'
import debug from 'debug'
import React, { useEffect, useRef, useState } from 'react'
import Redux from 'redux'
import { StringParam, useQueryParam } from 'use-query-params'
import { localUser } from '../lib/localUser'
import { randomDiscoveryKey } from '../lib/randomName'
import { Button } from './Button'
import { Container } from './Container'
import { Group } from './Group'
import { Status } from './Status'

export const Toolbar = ({
  storeManager,
  onStoreReady,
  children,
}: React.PropsWithChildren<ToolbarProps<any>>) => {
  // Hooks
  const [discoveryKey, setDiscoveryKey] = useQueryParam('id', StringParam)
  const [, setAppStore] = useState()
  const [inputHasFocus, setInputHasFocus] = useState(false)
  const [busy, setBusy] = useState(false)

  const input = useRef<HTMLInputElement>() as React.RefObject<HTMLInputElement>

  // join or create store on load
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

  // 'new' button click
  const createStore = async () => {
    setBusy(true)
    const newDiscoveryKey = randomDiscoveryKey()
    setDiscoveryKey(newDiscoveryKey)
    const newStore = await storeManager.createStore(newDiscoveryKey)
    setAppStore(newStore)
    onStoreReady(newStore, newDiscoveryKey)
    setBusy(false)
    log('created store', newDiscoveryKey)
    return newDiscoveryKey
  }

  // 'join' button click
  const joinStore = async (newDiscoveryKey?: string) => {
    if (!newDiscoveryKey) return
    if (busy) return
    setBusy(true)
    setDiscoveryKey(newDiscoveryKey)
    const newStore = await storeManager.joinStore(newDiscoveryKey)
    setAppStore(newStore)
    onStoreReady(newStore, newDiscoveryKey)
    setBusy(false)
    log('joined store', newDiscoveryKey)
  }

  // build url including discovery key
  const url = (discoveryKey: string = '') =>
    `${location.protocol}//${location.host}/?id=${discoveryKey}`

  // load a discoveryKey by navigating to its URL
  const load = (discoveryKey: string | undefined) => {
    if (discoveryKey !== undefined) window.location.assign(url(discoveryKey))
  }

  const newClick = async () => {
    const newDiscoveryKey = await createStore()
    setTimeout(() => load(newDiscoveryKey), 200)
  }

  return (
    <Container>
      <Group>
        <label>Welcome, {localUser.userName}</label>
      </Group>
      {/* New button */}
      <Group>
        <Button>👪 Team</Button>
      </Group>
      <Group>
        <Button onClick={newClick}>📄 New</Button>
      </Group>
      <Status storeManager={storeManager} />
      {children}
    </Container>
  )
}

export interface ToolbarProps<T> {
  storeManager: StoreManager<T>
  onStoreReady: (store: Redux.Store, discoveryKey: string) => void
}
