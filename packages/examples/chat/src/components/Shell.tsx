/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import { Toolbar } from 'cevitxe-toolbar'
import { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { storeManager } from 'store/store'
import { Chat } from './Chat'

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady = (store: Redux.Store) => setAppStore(store)

  return (
    <div css={wrapper}>
      <Toolbar storeManager={storeManager} onStoreReady={onStoreReady} />
      {appStore && (
        <Provider store={appStore}>
          <Chat />
        </Provider>
      )}
    </div>
  )
}

const wrapper = css`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  paddingtop: 2em;
`
