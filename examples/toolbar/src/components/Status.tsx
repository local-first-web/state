/** @jsxImportSource @emotion/react */
import { CLOSE, OPEN, PEER, PEER_REMOVE, StoreManager } from '@localfirst/state'
import { useEffect, useState } from 'react'
import { Group } from './Group'
import { StatusLight } from './StatusLight'

interface StatusProps {
  storeManager: StoreManager<any>
}

export const Status = ({ storeManager }: StatusProps) => {
  const [online, setOnline] = useState<boolean>(false)
  const [peers, setPeers] = useState<string[]>([])

  const onPeer = (updatedPeers: string[]) => {
    setPeers(updatedPeers)
  }

  const onOpen = () => {
    setOnline(true)
    setPeers([])
  }

  const onClose = () => {
    setOnline(false)
    setPeers([])
  }

  const addListeners = () => {
    storeManager.on(OPEN, onOpen)
    storeManager.on(CLOSE, onClose)
    storeManager.on(PEER, onPeer)
    storeManager.on(PEER_REMOVE, onPeer)
    return removeListeners // return cleanup function
  }

  const removeListeners = () => {
    storeManager.off(OPEN, onOpen)
    storeManager.off(CLOSE, onClose)
    storeManager.off(PEER, onPeer)
    storeManager.off(PEER_REMOVE, onPeer)
  }

  useEffect(addListeners, [storeManager]) // fires when storeManager changes

  const peerCountMessage =
    peers.length === 0
      ? 'no peers are connected'
      : peers.length === 1
      ? `one peer is connected`
      : `${peers.length} other peers are connected`
  const statusMessage = online ? `online; ${peerCountMessage}` : 'offline'
  return (
    <Group title={statusMessage}>
      <label>
        <StatusLight online={online} />
        {online ? <span css={{ marginLeft: '.5em' }}>{peers.length}</span> : ''}
      </label>
    </Group>
  )
}
