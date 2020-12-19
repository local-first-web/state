import React from 'react'
import './App.css'
import { Grid } from './Grid'
import { useSelector } from 'react-redux'
import { Loading } from './Loading'
import { Toolbar } from './Toolbar'

export const App = () => {
  const ready = useSelector(state => !!state)

  return ready ? (
    <>
      <Toolbar />
      <Grid />
    </>
  ) : (
    <Loading />
  )
}
