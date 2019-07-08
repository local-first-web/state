import { useState } from 'react'
import { Provider } from 'react-redux'
import React from 'react'
import Redux from 'redux'
import App from './App'
import { DialogProvider } from 'muibox'
import { Toolbar, ToolbarProps } from 'cevitxe-toolbar'
import { cevitxe } from 'src/redux/store'

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady = (store: Redux.Store) => setAppStore(store)

  return (
    <div>
      <Toolbar cevitxe={cevitxe} onStoreReady={onStoreReady} />
      {appStore && (
        <Provider store={appStore}>
          <DialogProvider>
            <App />
          </DialogProvider>
        </Provider>
      )}
    </div>
  )
}
