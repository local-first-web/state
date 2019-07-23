import React, { ChangeEvent } from 'react'
import { useDispatch } from 'react-redux'
import { addItem, inferSchema } from '../redux/actions'
import debug from 'debug'
const log = debug('cevitxe:grid:fileuploader')

export const FileUploader = () => {
  const dispatch = useDispatch()

  const loader = () => (event: ChangeEvent<HTMLInputElement>) => {
    log('loader')
    const reader = new FileReader()
    reader.onload = progress => {
      log('loading', progress)
      const data = JSON.parse((progress.target as any).result)
      dispatch(inferSchema(data))
      data.forEach((item: any) => {
        dispatch(addItem(item))
      })
      reader.readAsText(event.target.files![0])
    }
  }

  const loader1 = (...callBacks: any[]) => (event: ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader()
    reader.onload = progress => {
      const data = JSON.parse((progress.target as any).result)
      return callBacks.forEach(cb => dispatch(cb(data)))
    }
    reader.readAsText(event.target.files![0])
  }

  return (
    <div style={{ padding: '5px 10px', background: '#eee' }}>
      Upload data <input type="file" onChange={loader()} />
    </div>
  )
}
