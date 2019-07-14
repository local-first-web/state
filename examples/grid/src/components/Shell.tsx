/** @jsx jsx */

import { CSSObject, jsx } from '@emotion/core'
import { Toolbar } from 'cevitxe-toolbar'
import { DialogProvider } from 'muibox'
import { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { cevitxe } from 'src/redux/store'
import { App } from './App'

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady = (store: Redux.Store) => setAppStore(store)

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

type Stylesheet = { [k: string]: CSSObject }
const styles: Stylesheet = {
  shell: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100vh',
  },
}
