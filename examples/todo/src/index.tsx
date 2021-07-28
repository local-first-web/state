import React from 'react'
import ReactDOM from 'react-dom'
import { App } from './components'
import * as serviceWorker from './serviceWorker'

const start = () => {
  ReactDOM.render(<App />, document.getElementById('root'))
}

start()

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register()
