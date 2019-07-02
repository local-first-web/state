import { useState } from 'react'
import { Provider } from 'react-redux'
import React from 'react'
import Redux from 'redux'
import App from './App'
import { DialogProvider } from 'muibox'
import { Toolbar, ToolbarProps } from './Toolbar'

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady: ToolbarProps['onStoreReady'] = store => setAppStore(store)

  return (
    <div>
      <Toolbar onStoreReady={onStoreReady} />
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
