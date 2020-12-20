import { useEffect, useState } from 'react'
import Redux from 'redux'
import { storeManager } from './store'

export const useStore = (key: string | undefined, generateNewKey: () => string) => {
  const [appStore, setAppStore] = useState<Redux.Store>()

  useEffect(
    () => {
      if (key) {
        storeManager.joinStore(key).then((newStore) => setAppStore(newStore))
      } else {
        const newKey = generateNewKey()
        storeManager.createStore(newKey).then((newStore) => setAppStore(newStore))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )
  return appStore
}
