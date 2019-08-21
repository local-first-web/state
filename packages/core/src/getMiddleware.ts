import A, { ChangeFn } from 'automerge'
import debug from 'debug'
import { MiddlewareFactory, ProxyReducer } from './types'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_ITEM, DELETE_COLLECTION } from './constants'

const log = debug('cevitxe:middleware')

interface DocMap {
  [key: string]: A.Doc<any>
}

export const getMiddleware: MiddlewareFactory = (feed, docSet, proxyReducer) => {
  return store => next => action => {
    // before changes

    // detect which documents will be changed and cache them
    const affectedDocs: DocMap = {} // cache for docs that will be changed
    const removedDocs: string[] = [] // list of docs that will be removed

    const functionMap = proxyReducer(action)
    if (functionMap) {
      for (let docId in functionMap) {
        const fn = functionMap[docId] as ChangeFn<any> | symbol
        if (fn === DELETE_COLLECTION) {
          const index = docSet.getDoc(docId)
          for (const itemDocId in index) removedDocs.push(itemDocId)
          removedDocs.push(docId)
        } else if (fn === DELETE_ITEM) {
          removedDocs.push(docId)
        } else if (typeof fn === 'function') {
          affectedDocs[docId] = docSet.getDoc(docId) || A.init() // If doc didn't exist before, it's a new doc
        }
      }
    }

    // changes
    const newState = next(action)

    // after changes
    log('%o', { action })

    // collect document changes for persistence
    const changeSets = []
    if (action.type === RECEIVE_MESSAGE_FROM_PEER) {
      // for changes coming from peer, we already have the Automerge changes, so just persist them
      const { docId, changes } = action.payload.message
      changeSets.push({ docId, changes })
    } else {
      // for insert/update, we generate the changes by comparing each document before & after
      for (const docId in affectedDocs) {
        const oldDoc = affectedDocs[docId]
        const newDoc = docSet.getDoc(docId)
        const changes = A.getChanges(oldDoc, newDoc)
        if (changes.length > 0) changeSets.push({ docId, changes })
      }
      // for remove actions, we've made a list, so we just add a flag for each
      for (const docId of removedDocs) changeSets.push({ docId, changes: [], isDelete: true })
    }

    // write any changes to the feed
    if (changeSets.length) feed.append(JSON.stringify(changeSets))

    return newState
  }
}
