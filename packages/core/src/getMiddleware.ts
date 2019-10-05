import A from 'automerge'
import debug from 'debug'
import { collection } from './collection'
import { DELETE_COLLECTION, RECEIVE_MESSAGE_FROM_PEER } from './constants'
import { getMemUsage } from './lib/getMemUsage'
import { ChangeSet, RepoSnapshot, MiddlewareFactory } from './types'

const log = debug('cevitxe:middleware')

export const getMiddleware: MiddlewareFactory = (repo, proxyReducer) => {
  return store => next => action => {
    // BEFORE CHANGES

    // detect which documents will be changed and cache them
    const affectedDocs: RepoSnapshot = {} // cache for docs that will be changed
    const removedDocs: string[] = [] // list of docs that will be removed

    const functionMap = proxyReducer(store.getState(), action)
    if (functionMap) {
      for (let documentId in functionMap) {
        const fn = functionMap[documentId]
        if (fn === DELETE_COLLECTION) {
          log('DELETE_COLLECTION')
          const name = collection.getCollectionName(documentId)
          const documentIds = collection(name).selectors.keys(store.getState(), {
            includeDeleted: true,
          })
          // Record each doc as removed so we can note that in the storage feed
          for (const itemdocumentId of documentIds) removedDocs.push(itemdocumentId)
        } else if (typeof fn === 'function') {
          // Doc will be run through a change function. Cache the previous version of the doc so we
          // can record changes for the storage feed
          const oldDoc = repo.getDoc(documentId) || A.init() // create a new doc if one doesn't exist
          affectedDocs[documentId] = oldDoc
        }
      }
    }

    // CHANGES
    log(`before changes`, getMemUsage())

    const newState = next(action)

    // AFTER CHANGES

    log('%o', { action })

    // collect document changes for persistence
    const changeSets: ChangeSet[] = []

    if (action.type === RECEIVE_MESSAGE_FROM_PEER) {
      // for changes coming from peer, we already have the Automerge changes, so just persist them
      const { documentId, changes } = action.payload.message
      const newDoc = repo.getDoc(documentId)
      repo.saveSnapshot(documentId, newDoc)
      changeSets.push({ documentId, changes })
    } else {
      // for insert/update, we generate the changes by comparing each document before & after
      for (const documentId in affectedDocs) {
        const oldDoc = affectedDocs[documentId]
        const newDoc = repo.getDoc(documentId)!
        repo.saveSnapshot(documentId, newDoc)
        const changes = A.getChanges(oldDoc, newDoc)
        if (changes.length > 0) changeSets.push({ documentId, changes })
      }
      // for remove actions, we've made a list, so we just add a flag for each
      for (const documentId of removedDocs) {
        const changeSet: ChangeSet = {
          documentId,
          changes: [],
          isDelete: true,
        }
        changeSets.push(changeSet)
      }
    }

    log(`before writing to feed`, getMemUsage())
    // write any changes to the feed
    for (const changeSet of changeSets) {
      repo.appendChangeset(changeSet)
    }
    log(`after writing to feed`, getMemUsage())

    return newState
  }
}
