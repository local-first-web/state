import { Dropdown, Group, MenuItem } from 'cevitxe-toolbar'
import { Label } from 'cevitxe-toolbar/dist/src/components/Label'
import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'redux/actions'
import { nextFrame } from '../utils/nextFrame'
import GeneratorWorker from './dataGenerator.worker'
import { dataGeneratorSchema } from './dataGeneratorSchema'
import { ProgressBar } from './ProgressBar'

/**
 * The actual generation of random data is performed in a worker
 */
const generator = new GeneratorWorker()

export function DataGenerator() {
  const dispatch = useDispatch()
  const [progress, setProgress] = useState(0)

  const generate = async (rows: number) => {
    setProgress(0)
    dispatch(clearCollection())
    dispatch(loadSchema(dataGeneratorSchema))

    generator.onmessage = async event => {
      const { progress: reportedProgress, result } = event.data

      await nextFrame()
      if (reportedProgress) {
        setProgress(Math.ceil((reportedProgress / rows) * 100))
      }
      if (result) {
        setProgress(0)
        const collection = event.data.result
        dispatch(loadCollection(collection))
      }
    }
    generator.postMessage(rows)
  }

  const datasetSizes = [10, 100, 1000, 10000, 100000, 200000, 500000, 1000000]

  return (
    <Group>
      <Dropdown
        buttonText={progress ? '⌚ Generating...' : '⚙ Generate data'}
        disabled={progress > 0}
      >
        {datasetSizes.map(nRows => (
          <MenuItem
            key={nRows}
            type="button"
            disabled={progress > 0}
            onClick={() => generate(nRows)}
          >
            {nRows.toLocaleString()} rows
          </MenuItem>
        ))}
      </Dropdown>
      {progress > 0 && (
        <>
          <ProgressBar percentComplete={progress} />
          <Label>{`${progress}%`}</Label>
        </>
      )}
    </Group>
  )
}
