/** @jsx jsx */

import { css, jsx } from '@emotion/core'
import { Toolbar } from 'toolbar'
import debug from 'debug'
import { DialogProvider } from 'muibox'
import { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { storeManager } from '../redux/store'
import { App } from './App'
import { Loading } from './Loading'

const log = debug('cevitxe:grid:shell')

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady = (store: Redux.Store, discoveryKey: string) => {
    log('store ready', discoveryKey)
    setAppStore(store)
  }

  return (
    <div css={styles.shell}>
      <Toolbar storeManager={storeManager} onStoreReady={onStoreReady} />
      {appStore === undefined ? (
        <Loading />
      ) : (
        <Provider store={appStore}>
          <DialogProvider>
            <App />
          </DialogProvider>
        </Provider>
      )}
    </div>
  )
}

const styles = {
  shell: css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
  }),
}
