/** @jsx jsx */
import { jsx } from '@emotion/core'
import CounterWorker from '../workers/counter.worker'
import { styles } from 'cevitxe-toolbar'
import { useState } from 'react'

const worker = new CounterWorker()

export const Counter = () => {
  const [progress, setProgress] = useState(0)

  worker.onmessage = event => {
    setProgress(+event.data)
  }

  const startCounter = () => {
    console.log('startCounter')
    const initialValue = progress
    worker.postMessage(initialValue)
  }

  return (
    <div css={styles.toolbarGroup}>
      <button type="button" css={styles.button} disabled={progress > 0} onClick={startCounter}>
        Start count
      </button>
      <label>{progress}</label>
    </div>
  )
}
