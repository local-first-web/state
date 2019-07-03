/** @jsx jsx */
import { css, jsx } from '@emotion/core'
import React, { useState } from 'react'
import { Provider } from 'react-redux'
import Redux from 'redux'
import { Chat } from './Chat'
import { Toolbar, ToolbarProps } from './Toolbar'

export const Shell = () => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  const onStoreReady: ToolbarProps['onStoreReady'] = store => setAppStore(store)

  return (
    <div css={wrapper}>
      <Toolbar onStoreReady={onStoreReady} />
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
`
