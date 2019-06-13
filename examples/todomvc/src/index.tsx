import React from 'react'
import ReactDOM from 'react-dom'

import { Provider } from 'react-redux'
import { store, persistor } from './redux/store'

import App from './components/App'
import { PersistGate } from 'redux-persist/integration/react'

const rootElement = document.getElementById('root')
ReactDOM.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>,
  rootElement
)
