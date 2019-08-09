/** @jsx jsx */
import { jsx } from '@emotion/core'
import { styles } from 'cevitxe-toolbar'
import { DataGenerator } from './DataGenerator'
import { useSelector } from 'react-redux'
import { State } from 'src/redux/store'

export function Toolbar() {
  const rows = useSelector((state: State) => {
    if (state === undefined || state.list === undefined) return 0
    return state.list.length
  })

  const loading = useSelector((state: State) => {
    if (state === undefined || state.list === undefined) return 'Loading...'
    return ''
  })

  return (
    <div css={styles.toolbar}>
      <DataGenerator />
      <div css={styles.toolbarGroup}>
        <label>{rows} rows</label>
      </div>
      <div css={styles.toolbarGroup}>
        <label>{loading}</label>
      </div>
    </div>
  )
}
