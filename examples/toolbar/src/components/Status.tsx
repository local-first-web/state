/** @jsxImportSource @emotion/react */
import { CLOSE, OPEN, PEER, PEER_REMOVE, StoreManager } from '@localfirst/state'
import React, { useEffect, useState } from 'react'
import { Group } from './Group'
import { StatusLight } from './StatusLight'
import { PEER_UPDATE } from '@localfirst/state/dist/src/constants'

interface StatusProps {
  storeManager: StoreManager<any>
}

export const Status = ({ storeManager }: StatusProps) => {
  const [online, setOnline] = useState<boolean>(false)
  const [peers, setPeers] = useState<string[]>([])

  const onPeer = (updatedPeers: string[], updatedAuthenticatedUserInfo: {generation: number, name: string, type: 'ADMIN' | 'MEMBER'}[]) => {
    setPeers(updatedAuthenticatedUserInfo.map((v, i) => `${(v && v.type) === 'ADMIN' ? '👑' : ''} ${(v && v.name) ? v.name : `?${updatedPeers[i]}?`}`))
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
    storeManager.on(PEER_UPDATE, onPeer)
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

  const peerItems = peers.map(p => <li key={p}><button>{getAvatar(p)}{p}</button></li>)

  return (
    <Group title={statusMessage}>
      <label>
        <StatusLight online={online} />
        {online ? <span style={{ marginLeft: '.5em' }}>{peers.length} online</span> : ''}
      </label>
      <ul>
        {peerItems}
      </ul>
    </Group>
  )
}


const avatars = [
  '👶', // Baby
  '🧒', // Child
  '🧑', // Person
  '👱', // Person: Blond Hair
  '🧔', // Person: Beard
  '👨‍🦰', // Man: Red Hair
  '👨‍🦳', // Man: White Hair
  '👩', // Woman
  '👩‍🦰', // Woman: Red Hair
  '🧑‍🦰', // Person: Red Hair
  '👩‍🦱', // Woman: Curly Hair
  '🧑‍🦳', // Person: White Hair
  '👱‍♀️', // Woman: Blond Hair
  '🧓', // Older Person
]
const hashCode = (s: string) => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)
function getAvatar(username: string) {
  if (username.endsWith('?')) { return null }
 return avatars[Math.abs(hashCode(username)) % avatars.length]
}