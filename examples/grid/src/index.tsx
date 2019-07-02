import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import * as serviceWorker from './serviceWorker'

import { Shell } from './components/Shell'

const start = async () => {
  const rootElement = document.getElementById('root')
  ReactDOM.render(<Shell />, rootElement)
}
start()
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
