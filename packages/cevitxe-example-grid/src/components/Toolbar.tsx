/** @jsx jsx */
import { jsx } from '@emotion/core'
import { styles } from 'cevitxe-toolbar'
import { useSelector } from 'react-redux'
import { DataGenerator } from './DataGenerator'

export const Toolbar = () => (
  <div css={{ ...styles.toolbar, zIndex: 2 }}>
    <DataGenerator />
    <Loading />
    <Rows />
  </div>
)

const Rows = () => {
  const rows = useSelector((state: any) => {
    return Object.keys(state.rows).length
  })
  return (
    <div css={styles.toolbarGroup}>
      <label>{rows} rows</label>
    </div>
  )
}

const Loading = () => {
  const loading = useSelector((state: any) => {
    return state === undefined
  })
  return loading ? (
    <div css={styles.toolbarGroup}>
      <label>Loading...</label>
    </div>
  ) : (
    <div />
  )
}
