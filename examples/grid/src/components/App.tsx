import React from 'react'
import './App.css'
import List from './List'
import { useSelector } from 'react-redux'
import { Loading } from './Loading'

const App: React.FC = () => {
  const ready = useSelector(state => !!state)
  return (
    <div className="App">
      {/**/}
      {ready ? <List /> : <Loading />}
    </div>
  )
}

export default App
