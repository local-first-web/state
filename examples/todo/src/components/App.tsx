import { randomDiscoveryKey } from 'lib/randomName'
import React, { useState } from 'react'
import Redux from 'redux'
import { Provider } from 'react-redux'
import { useQueryParam } from 'use-query-params'
import { Toolbar } from '@localfirst/toolbar'
import { Todos } from '.'
import { useStore } from '../redux/useStore'
import { storeManager } from '../redux/store'

export const App: React.FC = () => {
  const [key, setKey] = useQueryParam<string>('key')

  const generateNewKey = () => {
    const newKey = randomDiscoveryKey()
    setKey(newKey)
    return newKey
  }

  const appStore = useStore(key, generateNewKey)
  const [_, setAppStore] = useState<Redux.Store>()
  const onStoreReady = (store: Redux.Store) => setAppStore(store)

  return appStore ? (
    <Provider store={appStore}>
      <Toolbar storeManager={storeManager} onStoreReady={onStoreReady}/>
      <Todos />
    </Provider>
  ) : null
}
