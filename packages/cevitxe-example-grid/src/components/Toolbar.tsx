import { Group } from 'cevitxe-toolbar'
import { Label } from 'cevitxe-toolbar/dist/src/components/Label'
import React from 'react'
import { useSelector } from 'react-redux'
import { DataGenerator } from './DataGenerator'

export const Toolbar = () => (
  <>
    <DataGenerator />
    <Loading />
    <Rows />
  </>
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
    <></>
  )
}
