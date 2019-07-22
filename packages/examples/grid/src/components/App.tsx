import React, { ChangeEvent } from 'react'
import './App.css'
import List from './List'
import { loadSchema, loadCollection, inferSchema } from '../redux/actions'
import { useSelector, useDispatch } from 'react-redux'
import { Loading } from './Loading'

export const App = () => {
  const ready = useSelector(state => !!state)
  const dispatch = useDispatch()

  const loader = (...callBacks: any[]) => (event: ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader()
    reader.onload = progress => {
      const data = JSON.parse((progress.target as any).result)
      return callBacks.forEach(cb => dispatch(cb(data)))
    }
    reader.readAsText(event.target.files![0])
  }
  return ready ? (
    <>
      <div>
        Schema: <input type="file" onChange={loader(loadSchema)} />
        Data: <input type="file" onChange={loader(loadCollection)} />
        Magic Data: <input type="file" onChange={loader(inferSchema, loadCollection)} />
      </div>
      <List />
    </>
  ) : (
    <Loading />
  )
}
