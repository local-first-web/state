import React, { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'

import { Todos } from '../components'
import { Toolbar } from '@cevitxe/toolbar'
import { cevitxe } from '../redux/store'

export function App() {
  const [appStore, setAppStore] = useState<Redux.Store>()
  const onStoreReady = (store: Redux.Store) => setAppStore(store)

  return (
    <>
      <Toolbar cevitxe={cevitxe} onStoreReady={onStoreReady} />
      {appStore && (
        <Provider store={appStore}>
          <Todos />
        </Provider>
      )}
    </>
  )
}
