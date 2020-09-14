/** @jsx jsx */
import { jsx } from '@emotion/core'
import { StoreManager } from 'cevitxe'
import { InviteButton } from './InviteButton'
import debug from 'debug'
import React, { useEffect, useState } from 'react'
import Redux from 'redux'
import { Team } from 'taco-js'
import { StringParam, useQueryParam } from 'use-query-params'
import { localUser } from '../lib/localUser'
import { randomDiscoveryKey } from '../lib/randomName'
import { getTeam } from '../lib/team'
import { Button } from './Button'
import { Group } from './Group'
import { Status } from './Status'
import { TeamDropdown } from './TeamDropdown'
import { Container } from './ToolbarRow'
import { WelcomeMessage } from './WelcomeMessage'

export const Toolbar = ({
  storeManager,
  onStoreReady,
  children,
}: React.PropsWithChildren<ToolbarProps<any>>) => {
  // Hooks
  const [discoveryKey, setDiscoveryKey] = useQueryParam('id', StringParam)
  const [_appStore, setAppStore] = useState<Redux.Store>()
  const [busy, setBusy] = useState(false)
  const [team, setTeam] = useState<Team | undefined>(undefined)

  // join or create store on load
  useEffect(() => {
    log('setup')
    if (discoveryKey) joinStore(discoveryKey)
    else createStore()
    const _team = getTeam(discoveryKey!, { user: localUser })
    setTeam(_team)
  }, []) // only runs on first render

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
      <WelcomeMessage name={localUser.userName} />
      <Group>
        <TeamDropdown team={team}></TeamDropdown>
      </Group>
      <Group>
        <InviteButton />
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
