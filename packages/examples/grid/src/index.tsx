import 'core-js'
import React from 'react'
import ReactDOM from 'react-dom'
import './index.css'

import { Shell } from './components/Shell'

const start = async () => {
  const rootElement = document.getElementById('root')
  ReactDOM.render(<Shell />, rootElement)
}
start()
