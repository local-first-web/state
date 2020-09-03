/** @jsx jsx */
import { jsx } from '@emotion/core'
import { Fragment } from 'react'

import { Container, Group } from 'cevitxe-toolbar'
import { useSelector } from 'react-redux'
import { DataGenerator } from './DataGenerator'

export const Toolbar = () => (
  <Container>
    <DataGenerator />
    <Loading />
    <Rows />
  </Container>
)

const Rows = () => {
  const rows = useSelector((state: any) => {
    return Object.keys(state.rows).length
  })
  return (
    <Group>
      <label>{rows} rows</label>
    </Group>
  )
}

const Loading = () => {
  const loading = useSelector((state: any) => {
    return state === undefined
  })
  return loading ? (
    <Group>
      <label>Loading...</label>
    </Group>
  ) : (
    <Fragment></Fragment>
  )
}
