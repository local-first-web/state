/** @jsx jsx */
import { jsx } from '@emotion/core'
import { styles } from 'cevitxe-toolbar'
import { DataGenerator } from './DataGenerator'
import { useSelector } from 'react-redux'
import { rowCollectionKey } from '../redux/store'

export const Toolbar = () => (
  <div css={styles.toolbar}>
    <DataGenerator />
    <Loading />
    <Rows />
    <MemoryStats />
  </div>
)

const Rows = () => {
    if (state === undefined || state.list === undefined) return 0
    return state.list.length
  const rows = useSelector((state: any) => {
  })
  return (
    <div css={styles.toolbarGroup}>
      <label>{rows} rows</label>
    </div>
  )
}
const Loading = () => {
  const loading = useSelector((state: any) => {
    if (state === undefined || state[rowCollectionKey] === undefined) return true
    else return false
  })
  return loading ? (
    <div css={styles.toolbarGroup}>
      <label>Loading...</label>
    </div>
  ) : (
    <div />
  )
}

const MemoryStats = () => {
  const percent = (n: number) => Math.floor(n * 100) + '%'
  const mb = (n: number) => Math.floor(n / 1024 / 1024) + ' MB'

  const { memory } = window.performance as any

  if (!memory) return <div />
  const { jsHeapSizeLimit: limit, usedJSHeapSize: used } = memory
  return (
    <div css={styles.toolbarGroup}>
      <label>
        JS heap used: {mb(used)} ({percent(used / limit)})
      </label>
    </div>
  )
}
