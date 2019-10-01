/** @jsx jsx */
import { jsx } from '@emotion/core'
import CounterWorker from '../workers/counter.worker'
import { styles } from 'cevitxe-toolbar'
import { useState } from 'react'

const worker = new CounterWorker()

export const Counter = () => {
  const [started, setStarted] = useState(false)

  const buttonClick = () => {
    if (!started) {
      worker.postMessage('start')
      setStarted(true)
    } else {
      worker.postMessage('stop')
      setStarted(false)
    }
  }

  return (
    <div css={styles.toolbarGroup}>
      <button type="button" css={styles.button} onClick={buttonClick}>
        {started ? 'Stop count' : 'Start count'}
      </button>
    </div>
  )
}

export const CounterProgress = () => {
  const [progress, setProgress] = useState(0)
  worker.onmessage = event => {
    setProgress(+event.data)
  }

  return (
    <div css={styles.toolbarGroup}>
      <label>{progress}</label>
    </div>
  )
}
