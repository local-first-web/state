import React from 'react'
import './App.css'
import List from './List'
import { useSelector } from 'react-redux'

const App: React.FC = () => {
  const ready = useSelector(state => !!state)
  if (!ready) return <>Loading</>
  return (
    <div className="App">
      <List />
    </div>
  )
}

export default App
