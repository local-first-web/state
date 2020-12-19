import React, { ChangeEvent } from 'react'
import { useDispatch } from 'react-redux'
import { addItem, inferSchema, clearCollection } from '../redux/actions'
import debug from 'debug'
const log = debug('lf:grid:fileuploader')

export const FileUploader = () => {
  const dispatch = useDispatch()

  const loader = (event: ChangeEvent<HTMLInputElement>) => {
    log('loader')
    const reader = new FileReader()
    reader.onload = progress => {
      log('loading', progress)
      const data = JSON.parse((progress.target as any).result)
      dispatch(clearCollection())
      dispatch(inferSchema(data))
      Object.values(data).forEach((item: any) => {
        dispatch(addItem(item))
      })
    }
    reader.readAsText(event.target.files![0])
  }

  return (
    <div style={{ padding: '5px 10px', background: '#eee' }}>
      Upload data <input type="file" onChange={loader} />
    </div>
  )
}
