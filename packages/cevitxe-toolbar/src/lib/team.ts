const STORAGE_KEY = 'CEVITXE_STORAGE'
const TEAM_STORAGE_KEY = `${STORAGE_KEY}__TEAM`

import { createTeam, loadTeam, Team, LocalUserContext } from 'taco-js'

const storage = localStorage

export const getTeam = (discoveryKey: string, localUserContext: LocalUserContext): Team => {
  // Look for stored team
  const storageKey = `${TEAM_STORAGE_KEY}__${discoveryKey}`
  const serializedChain = storage.getItem(storageKey)

  if (serializedChain === null)
    // team doesn't exist yet, create one
    return createTeam(discoveryKey, localUserContext)

  // team exists, rehydrate it
  const chain = JSON.parse(serializedChain)
  return loadTeam(chain, localUserContext)
}

export const saveTeam = (discoveryKey: string, team: Team) => {
  const storageKey = `${TEAM_STORAGE_KEY}__${discoveryKey}`

  // get the chain data as a string from the team
  const serializedChain = team.save()

  // save it
  localStorage.setItem(storageKey, serializedChain)
}
