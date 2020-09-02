/** @jsx jsx */
import { jsx } from '@emotion/core'
import { JSONSchema7 } from 'json-schema'
import { Fragment, useState } from 'react'
import { useDispatch } from 'react-redux'
import { clearCollection, loadCollection, loadSchema } from 'redux/actions'

import { nextFrame } from '../utils/nextFrame'
import GeneratorWorker from './dataGenerator.worker'
import { ProgressBar } from './ProgressBar'
import { Button, Group, MenuWrapper, Menu, MenuItem } from 'cevitxe-toolbar'

/**
 * The actual generation of random data is performed in a worker
 */
const generator = new GeneratorWorker()

export function DataGenerator() {
  const dispatch = useDispatch()
  const [menuOpen, setMenuOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  const toggleMenu = () => setTimeout(() => setMenuOpen(!menuOpen))
  const hideMenu = () => setTimeout(() => setMenuOpen(false), 500)

  const generate = async (rows: number) => {
    setProgress(0)
    dispatch(clearCollection())
    dispatch(loadSchema(schema))

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

  return (
    <Group>
      <MenuWrapper>
        <Button onFocus={toggleMenu} onBlur={hideMenu} disabled={progress > 0}>
          {progress ? '⌚ Generating...' : '🧮 Generate data'}
        </Button>
        <Menu open={menuOpen}>
          {[10, 100, 1000, 10000, 100000, 200000, 500000, 1000000].map(rows => (
            <MenuItem
              key={rows}
              type="button"
              disabled={progress > 0}
              onClick={() => {
                generate(rows)
              }}
            >
              {rows.toLocaleString()} rows
            </MenuItem>
          ))}
        </Menu>
      </MenuWrapper>
      {progress > 0 && (
        <Fragment>
          <ProgressBar percentComplete={progress} />
          <label>{`${progress}%`}</label>
        </Fragment>
      )}
    </Group>
  )
}

const schema = {
  type: 'object',
  properties: {
    name: {},
    email: { format: 'email' },
    age: { type: 'number' },
    street: {},
    city: {},
    state: {},
    zip: {},
    gender: {},
    latitude: {},
    longitude: {},
    paragraph: {},
    displayOrder: { type: 'number' },
  },
} as JSONSchema7
