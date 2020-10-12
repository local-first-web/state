import React, { Fragment } from 'react'

import { Container, Group } from 'cevitxe-toolbar'
import { useSelector } from 'react-redux'
import { DataGenerator } from './DataGenerator'
import { Label } from 'cevitxe-toolbar/dist/src/components/Label'

export const Toolbar = () => (
  <React.Fragment>
    <DataGenerator />
    <Loading />
    <Rows />
  </React.Fragment>
)

const Rows = () => {
  const rows = useSelector((state: any) => {
    return Object.keys(state.rows).length
  })
  return (
    <Group>
      <Label>{rows} rows</Label>
    </Group>
  )
}

const Loading = () => {
  const loading = useSelector((state: any) => {
    return state === undefined
  })
  return loading ? (
    <Group>
      <Label>Loading...</Label>
    </Group>
  ) : (
    <Fragment></Fragment>
  )
}
