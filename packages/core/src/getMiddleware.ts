import A, { ChangeFn } from 'automerge'
import { DocSet } from './lib/automerge'
import debug from 'debug'
import { MiddlewareFactory, ProxyReducer } from './types'
import { RECEIVE_MESSAGE_FROM_PEER, DELETE_ITEM, DELETE_COLLECTION } from './constants'
import { docSetToObject } from './docSetHelpers'

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
    const affectedDocs: DocMap = {} // cache for docs that will be changed
    const removedDocs: string[] = [] // list of docs that will be removed
    const functionMap = proxyReducer(action)
    if (functionMap) {
      for (let docId in functionMap) {
        const fn = functionMap[docId] as ChangeFn<any> | symbol
        if (fn === DELETE_COLLECTION) {
          const collectionIndexDoc = docSet.getDoc(docId)
          for (const collectionItemId in collectionIndexDoc) {
            removedDocs.push(collectionItemId)
          }
          removedDocs.push(docId)
        } else if (fn === DELETE_ITEM) {
          removedDocs.push(docId)
        } else if (typeof fn === 'function') {
          affectedDocs[docId] = docSet.getDoc(docId)
        }
      }
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
      // insert/update actions
      // @ts-ignore
      for (let docId of docSet.docIds) {
        const oldDoc = affectedDocs[docId] || A.init() // If doc didn't exist before, it's a new doc
        const newDoc = docSet.getDoc(docId)
        const changes = A.getChanges(oldDoc, newDoc)
        if (changes.length > 0) changeSets.push({ docId, changes })
      }
      // remove actions
      for (const docId of removedDocs) {
        // Special flag to tell the feed consumer to remove this doc
        changeSets.push({ docId, changes: [], isDelete: true })
      }
    }
    // write any changes to the feed
    if (changeSets.length > 0) feed.append(JSON.stringify(changeSets))

    return newState
  }
}
