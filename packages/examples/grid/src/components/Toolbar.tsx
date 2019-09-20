/** @jsx jsx */
import { jsx } from '@emotion/core'
import { collection } from 'cevitxe'
import { styles } from 'cevitxe-toolbar'
import { useSelector } from 'react-redux'
import { Counter } from './Counter'
import { DataGenerator } from './DataGenerator'

export const Toolbar = () => (
  <div css={{ ...styles.toolbar, zIndex: 2 }}>
    <DataGenerator />
    <Loading />
    <Rows />
    {/* <MemoryStats /> */}
    <Counter />
  </div>
)

const Rows = () => {
  const rows = useSelector((state: any) => {
    return collection('rows').selectors.count(state)
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

// const MemoryStats = () => {
//   const percent = (n: number) => Math.floor(n * 100) + '%'
//   const mb = (n: number) => Math.floor(n / 1024 / 1024) + ' MB'

//   const { memory } = window.performance as any

//   if (!memory) return <div />
//   const { jsHeapSizeLimit: limit, usedJSHeapSize: used } = memory
//   return (
//     <div css={styles.toolbarGroup}>
//       <label>
//         JS heap used: {mb(used)} ({percent(used / limit)})
//       </label>
//     </div>
//   )
// }
