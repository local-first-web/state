import A from 'automerge'
import debug from 'debug'
import { collection } from './collection'
import { DELETE_COLLECTION, DELETE_ITEM, RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { ChangeSet, MiddlewareFactory, State } from './types'

const log = debug('cevitxe:middleware')

export const getMiddleware: MiddlewareFactory = (feed, docSet, proxyReducer) => {
  return store => next => action => {
    // BEFORE CHANGES

    // detect which documents will be changed and cache them
    const affectedDocs: State = {} // cache for docs that will be changed
    const removedDocs: string[] = [] // list of docs that will be removed

    const functionMap = proxyReducer(store.getState(), action)
    if (functionMap) {
      for (let docId in functionMap) {
        const fn = functionMap[docId]
        if (fn === DELETE_COLLECTION) {
          const name = collection.getCollectionName(docId)
          const docIds = collection(name).selectors.keys(store.getState())
          for (const itemDocId in docIds) removedDocs.push(itemDocId)
          collection(name).deleteAll(docSet)
        } else if (fn === DELETE_ITEM) {
          removedDocs.push(docId)
        } else if (typeof fn === 'function') {
          const oldDoc = docSet.getDoc(docId) || A.init() // create a new doc if one doesn't exist
          affectedDocs[docId] = oldDoc
        }
      }
    }

    // CHANGES

    const newState = next(action)

    // AFTER CHANGES

    log('%o', { action })

    // collect document changes for persistence
    const changeSets: ChangeSet[] = []

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
      for (const docId of removedDocs) {
        const changeSet: ChangeSet = {
          docId,
          changes: [],
          isDelete: true,
        }
        changeSets.push(changeSet)
      }
    }

    // write any changes to the feed
    if (changeSets.length) feed.append(JSON.stringify(changeSets))

    return newState
  }
}
