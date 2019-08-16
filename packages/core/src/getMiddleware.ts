import A from 'automerge'
import debug from 'debug'
import { MiddlewareFactory } from './types'

const log = debug('cevitxe:middleware')

export const getMiddleware: MiddlewareFactory = <T>(
  feed: Feed<string>,
  docSet: A.DocSet<any>,
  discoveryKey?: string
) => {
  return store => next => action => {
    // before changes
    const prevState = store.getState()

    // changes
    const result = next(action)

    // after changes
    const nextState = store.getState()
    log('%o', {
      discoveryKey,
      action,
      prevState,
      nextState,
    })

    // // Write all actions to the feed for persistence
    // let changeSets = []
    // // @ts-ignore
    // for (let docId of docSet.docIds) {
    //   const prevDoc = prevDocSet.getDoc(docId) || A.init()
    //   const nextDoc = docSet.getDoc(docId)
    //   const changes = A.getChanges(prevDoc, nextDoc)
    //   if (changes.length > 0)
    //     changeSets.push({
    //       docId,
    //       changes,
    //     })
    // }
    // if (changeSets.length > 0) feed.append(JSON.stringify(changeSets))
    return result
  }
}
