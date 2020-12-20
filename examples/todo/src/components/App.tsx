import { randomDiscoveryKey } from 'lib/randomName'
import React from 'react'
import { Provider } from 'react-redux'
import { useQueryParam } from 'use-query-params'
import { Todos } from '.'
import { useStore } from '../redux/useStore'

export const App: React.FC = () => {
  const [key, setKey] = useQueryParam<string>('key')

  const generateNewKey = () => {
    const newKey = randomDiscoveryKey()
    setKey(newKey)
    return newKey
  }

  const appStore = useStore(key, generateNewKey)

  return appStore ? (
    <Provider store={appStore}>
      <Todos />
    </Provider>
  ) : null
}
