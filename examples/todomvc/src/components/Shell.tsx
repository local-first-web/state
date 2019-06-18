import React, { useState, CSSProperties } from 'react'
import { Provider } from 'react-redux'
import App from './App'
import { buildStore } from '../redux/store'
import * as defaultKeys from '../secrets'
import { Store, AnyAction } from 'redux'

const cevitxeContainer: CSSProperties = {
  width: '100vw',
  position: 'absolute',
  top: -130,
  padding: 10,
  backgroundColor: 'white',
  borderBottom: 'solid 1px black',
}

const buttonStyle: CSSProperties = {
  marginLeft: 20,
  border: 'solid 1px #999',
  padding: 3,
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

  const reset = () => {
    setAppStore(null)
    setKeys({ key: '', secret: '' })
  }

  const createStore = async () => {
    console.log('key', keys.key, keys.secret)
    const store = await buildStore(keys.key, keys.secret) //.then((store: CevitxeStore) => {
    setAppStore(store.store)
    setKeys({ key: store.key, secret: store.secretKey })
    //})
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
        <button role="button" onClick={createStore} style={buttonStyle}>
          Create Store
        </button>
        <button role="button" onClick={reset} style={buttonStyle}>
          Reset
        </button>
        <button role="button" onClick={useDefaultKeys} style={buttonStyle}>
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
