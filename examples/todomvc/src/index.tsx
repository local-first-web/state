import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import App from './components/App'
import { store } from './redux/store'

// console.log('index store', store)
// console.log('index store state', store.getState())

const start = async () => {
  const rootElement = document.getElementById('root')
  ReactDOM.render(
    <Provider store={await store}>
      <App />
    </Provider>,
    rootElement
  )
}
start()