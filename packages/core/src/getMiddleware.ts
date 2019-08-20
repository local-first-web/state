import A from 'automerge'
import { DocSet } from './lib/automerge'
import debug from 'debug'
import { MiddlewareFactory, ProxyReducer } from './types'
import { RECEIVE_MESSAGE_FROM_PEER } from './constants'

const log = debug('cevitxe:middleware')

interface DocMap {
  [key: string]: A.Doc<any>
}

export const getMiddleware: MiddlewareFactory = <T>(
  feed: Feed<string>,
  docSet: DocSet<any>,
  proxyReducer: ProxyReducer,
  discoveryKey?: string
) => {
  return store => next => action => {
    // before changes
    // detect which documents will be changed and cache them
    const affectedDocs: DocMap = {}
    const functionMap = proxyReducer(action)
    if (functionMap) {
      for (let docId in functionMap) affectedDocs[docId] = docSet.getDoc(docId)
    }

    // changes
    const newState = next(action)

    // after changes
    log('%o', { discoveryKey, action })

    // collect document changes for persistence
    let changeSets = []
    if (action.type === RECEIVE_MESSAGE_FROM_PEER) {
      const { docId, changes } = action.payload.message
      changeSets.push({ docId, changes })
    } else {
      // @ts-ignore
      for (let docId of docSet.docIds) {
        const oldDoc = affectedDocs[docId] || A.init() // If doc didn't exist before, it's a new doc
        const newDoc = docSet.getDoc(docId)
        const changes = A.getChanges(oldDoc, newDoc)
        if (changes.length > 0) changeSets.push({ docId, changes })
      }
    }
    // write any changes to the feed
    if (changeSets.length > 0) feed.append(JSON.stringify(changeSets))

    return newState
  }
}
