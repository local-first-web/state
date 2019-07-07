import React, { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'

import { Todos, Toolbar } from '.'

export function App() {
  const [appStore, setAppStore] = useState<Redux.Store>()
  const onStoreReady = (store: Redux.Store) => setAppStore(store)
  return (
    <>
      <Toolbar onStoreReady={onStoreReady} />
      {appStore && (
        <Provider store={appStore}>
          <Todos />
        </Provider>
      )}
    </>
  )
}
