/** @jsx jsx */

import { css, jsx } from '@emotion/core'
import { Toolbar } from 'cevitxe-toolbar'
import debug from 'debug'
import { DialogProvider } from 'muibox'
import { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { cevitxe } from '../redux/store'
import { App } from './App'

const log = debug('cevitxe:grid:shell')

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady = (store: Redux.Store) => {
    log('store ready', cevitxe.discoveryKey, store.getState())
    setAppStore(store)
  }

  return (
    <div css={styles.shell}>
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

const styles = {
  shell: css({
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
  }),
}
