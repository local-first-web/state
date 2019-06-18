import React, { useState, CSSProperties } from 'react'
import { Provider } from 'react-redux'
import App from './App'
import { buildStore } from '../redux/store'
import * as defaultKeys from '../secrets'
import { Store, AnyAction } from 'redux'

const cevitxeContainer: CSSProperties = {
  position: 'absolute',
  top: -130,
  padding: 10,
  backgroundColor: 'white',
  borderBottom: 'solid 1px black',
}

export const Shell = () => {
  const [appStore, setAppStore] = useState()
  const [keys, setKeys] = useState({ key: '', secret: '' })

  const keyChanged = (name: string) => (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => setKeys({ ...keys, [name]: e.currentTarget.value })

  const useDefaultKeys = () => {
    setKeys({ key: defaultKeys.key, secret: defaultKeys.secretKey })
  }

  const createStore = () => {
    console.log('key', keys.key, keys.secret)
    buildStore(keys.key, keys.secret).then((store: Store<any, AnyAction>) =>
      setAppStore(store)
    )
  }

  return (
    <>
      <div style={{ ...cevitxeContainer }}>
        <label>Key</label>
        <input
          type="text"
          value={keys.key}
          onChange={keyChanged('key')}
          placeholder="Key"
        />
        <label>Secret</label>
        <input
          type="text"
          value={keys.secret}
          onChange={keyChanged('secret')}
          placeholder="Secret key"
        />
        <button role="button" onClick={createStore}>
          Create Store
        </button>
        <button role="button" onClick={useDefaultKeys}>
          Default Keys
        </button>
      </div>
      {appStore && (
        <Provider store={appStore}>
          <App />
        </Provider>
      )}
    </>
  )
}
