import React, { ChangeEvent } from 'react'
import './App.css'
import List from './List'
import { loadSchema, loadCollection } from '../redux/actions'
import { useSelector, useDispatch } from 'react-redux'
import { Loading } from './Loading'

export const App = () => {
  const ready = useSelector(state => !!state)
  const dispatch = useDispatch()

  const loader = (cb: any) => (event: ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader()
    reader.onload = progress => dispatch(cb(JSON.parse((progress.target as any).result)))
    reader.readAsText(event.target.files![0])
  }
  return ready ? (
    <>
      <div>
        Schema: <input type="file" onChange={loader(loadSchema)} />
        Data: <input type="file" onChange={loader(loadCollection)} />
      </div>
      <List />
    </>
  ) : (
    <Loading />
  )
}
