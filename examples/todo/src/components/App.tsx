import React, { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { Toolbar } from '@localfirst/toolbar'

import { Todos } from '.'
import { storeManager } from '../redux/store'

export function App() {
  const [appStore, setAppStore] = useState<Redux.Store>()
  const onStoreReady = (store: Redux.Store) => setAppStore(store)

  return (
    <>
      <Toolbar storeManager={storeManager} onStoreReady={onStoreReady} />
      {appStore && (
        <Provider store={appStore}>
          <Todos />
        </Provider>
      )}
    </>
  )
}
