import React from 'react'
import ReactDOM from 'react-dom'
import { Shell } from './components/Shell'

const start = async () => {
  const rootElement = document.getElementById('root')
  ReactDOM.render(<Shell />, rootElement)
}
start()
