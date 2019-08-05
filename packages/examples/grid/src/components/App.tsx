import React from 'react'
import './App.css'
import List from './List'
import { useSelector } from 'react-redux'
import { Loading } from './Loading'
import { DataGenerator } from './DataGenerator'

export const App = () => {
  const ready = useSelector(state => !!state)

  return ready ? (
    <>
      <DataGenerator />
      <List />
    </>
  ) : (
    <Loading />
  )
}
