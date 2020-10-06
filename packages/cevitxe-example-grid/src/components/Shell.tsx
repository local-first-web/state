import { Windmill } from '@windmill/react-ui'
import { theme, Toolbar } from 'cevitxe-toolbar'
import debug from 'debug'
import React, { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { storeManager } from '../redux/store'
import { App } from './App'
import { Loading } from './Loading'
import { Toolbar as GridToolbar } from './Toolbar'

const log = debug('cevitxe:grid:shell')

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady = (store: Redux.Store, discoveryKey: string) => {
    log('store ready', discoveryKey)
    setAppStore(store)
  }

  return (
    <Windmill theme={theme}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh' }}>
        <div className="z-toolbar">
          <Toolbar storeManager={storeManager} onStoreReady={onStoreReady} />
          {appStore === undefined ? null : (
            <Provider store={appStore}>
              <GridToolbar />
            </Provider>
          )}
        </div>

        {appStore === undefined ? (
          <Loading />
        ) : (
          <Provider store={appStore}>
            <App />
          </Provider>
        )}
      </div>
    </Windmill>
  )
}
