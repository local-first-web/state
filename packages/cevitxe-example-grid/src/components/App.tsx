import React from 'react'
import './App.css'
import { Grid } from './Grid'
import { useSelector } from 'react-redux'
import { Loading } from './Loading'

export const App = () => {
  const ready = useSelector(state => !!state)

  return ready ? <Grid /> : <Loading />
}
