import React from 'react'
import ReactDOM from 'react-dom'
import App from './components/App'
import { StoreProvider } from './context'

const rootElement = document.getElementById('root')
ReactDOM.render(
  <StoreProvider>
    <App />
  </StoreProvider>,
  rootElement
)
