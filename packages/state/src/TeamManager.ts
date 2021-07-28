import { EventEmitter } from 'events'
import A from 'automerge'
import * as Auth from '@philschatz/auth'
import { MESSAGE } from './constants'
import { Repo } from './Repo'
import { ensure } from './types'

const pendingSaves: Promise<any>[] = []

const AUTH_KEY = '_AUTH'

// A Team is associated with a discoveryKey and may be in one of the following states:
// - loaded
// - loading from storage
// - invited-to
export class TeamManager {

    private teams: Map<string, [Auth.Team? , Invitation?]> = new Map()

    getInvitation(discoveryKey: string) {
        const t = this.teams.get(discoveryKey)
        return t && t[1]
    }

    async instantiateTeamIfAvailable(repo: Repo, discoveryKey: string, invitation?: Invitation): Promise<Auth.Team | undefined> {
        let team = this.teams.get(discoveryKey)
        if (team) {
            return team[0]
        } else if (invitation) {
            this.teams.set(discoveryKey, [undefined, invitation])
        } else {
            // Try loading the team from Storage
            if (repo.has(AUTH_KEY)) {
                const state = ensure(await repo.get(AUTH_KEY)) as Auth.TeamSignatureChain
                const user = ensure(Auth.loadUser())
                const team = new Auth.Team({
                    source: state,
                    context: {user}
                })
                this.addListener(repo, discoveryKey, team)
                return team
            }
        }
    }

    async instantiateTeamDefinitely(repo: Repo, discoveryKey: string, state: any): Promise<Auth.Team> {
        let team = this.teams.get(discoveryKey)
        if (team && team[0]) {
            throw new Error('BUG: Should not already have a team loaded up')
        } else {
            // Try loading the team from Storage
            repo.set(AUTH_KEY, A.from(removeUndefined(state)))
            const user = ensure(Auth.loadUser())
            const team = new Auth.Team({
                source: state,
                context: {user}
            })

            await this.addTeam(repo, discoveryKey, team)
            return team
        }
    }

    async addTeam(repo: Repo, discoveryKey: string, team: Auth.Team) {
        if (this.teams.has(discoveryKey)) {
            throw new Error('BUG? seems this already has a Team')
        }
        this.teams.set(discoveryKey, [team, undefined])
        await repo.set(AUTH_KEY, A.from(removeUndefined(team.chain)))
        this.addListener(repo, discoveryKey, team)
    }

    private addListener(repo: Repo, discoveryKey: string, team: Auth.Team) {        
        team.on('updated', async ({head: headId}: {head: string}) => {
            const headNode = removeUndefined(team.chain.links[headId])
            // Perform saves in order. Otherwise the storage gets corrupted
            if (pendingSaves.length > 0) {
                await Promise.all(pendingSaves)
                pendingSaves.splice(0, pendingSaves.length) // clear when done saving
            }

            pendingSaves.push(repo.change(AUTH_KEY, (doc) => {
                if (!doc.root) {
                    doc.root = headId
                }
                if (!doc.links) {
                    doc.links = {}
                }
                if (!doc.links[headId]) {
                    doc.head = headId
                    doc.links[headId] = headNode
                    // Loop over all the previous nodes and ensure they were added (out of sync updated events)
                    let curr = headNode
                    while (true) {
                        const prevId = (curr.body as any).prev
                        if (!prevId) {
                            break
                        }
                        const prev = team.chain.links[prevId]
                        if (!doc.links[prevId]) {
                            doc.links[prevId] = removeUndefined(prev)
                        } else {
                            break // prev node is already in the chain so we can skip it and all the previous ones
                        }
                        curr = prev
                    }
                }
            }))
        })
    }
}

export interface Invitation {
    username: string,
    invitationSeed: string
}

const teamManager = new TeamManager()
export function getTeamManager() {
    return teamManager
}

function removeUndefined<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T
}

export async function performAuthHandshake(repo: Repo, discoveryKey: string, invite: Invitation, socket: WebSocket): Promise<Auth.Team> {
    function send<T>(action: string, payload: T) {
      socket.send(JSON.stringify({action, payload}))
    }
    console.log('generating proof using invitation:', invite)
    const proof = Auth.generateProof(invite.invitationSeed, invite.username)
    console.log('Sending AUTH:JOIN to peer')
    send('AUTH:JOIN', proof)
    
    return new Promise((resolve, reject) => {
      const listener = async ({data}: MessageEvent) => {
        const message = JSON.parse(data)
        const {type, action, payload} = message
        if (type === 'HELLO') {
          // ignore
          return
        }
        switch(action) {
            case 'ENCRYPTED':
                console.log('Ignoring encrypted message')
                break
          case 'AUTH:JOIN':
            console.log('Well this is awkward. The peer without a Team is being asked to respond to an AUTH:JOIN event. All we can do is ignore it')
            break
          case 'AUTH:ADMITTED':
            // const authHistoryChanges = payload
            // const authHistoryDoc = A.applyChanges(A.from({}), authHistoryChanges)
            const authHistoryDoc = payload
            const user = Auth.createUser({
              userName: invite.username,
              deviceName: 'Laptop',
              deviceType: 1, // DeviceType.laptop,
              seed: invite.invitationSeed
            })
            const team = new Auth.Team({
              source: authHistoryDoc,
              context: {user: user}
            })
            team.encrypt('Just testing for runtime error. Howdy Everyone! If this fails then BUG???? none of the lockboxes have a publicKey that matches the ephemeral one for this invitee. Ensure that the code for the tempkeys in Auth.Team.join are seeded with "invitationSeed" instead of "this.seed"')
    
            // Update my keys
            team.join(proof)
  
            // We successfully loaded the team. Resolve promises and remove this authentication listener
            socket.removeEventListener(MESSAGE, listener)
            resolve(team)
            await getTeamManager().addTeam(repo, discoveryKey, team)
            break
          default:
            console.error(message)
            throw new Error(`BUG: unsupported message action "${action}"`)
        }
      }
      socket.addEventListener(MESSAGE, listener)
  
    })
  }