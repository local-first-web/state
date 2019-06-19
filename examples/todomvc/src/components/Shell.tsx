import { useState } from 'react'
import { Provider } from 'react-redux'
import React from 'react'
import Redux from 'redux'
import App from './App'
import { Toolbar, ToolbarProps } from './Toolbar'

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store | null>(null)

  const onStoreReady: ToolbarProps['onStoreReady'] = store => setAppStore(store)

  return (
    <div>
      <Toolbar onStoreReady={onStoreReady} />
      {appStore && (
        <Provider store={appStore}>
          <App />
        </Provider>
      )}
    </div>
  )
}
