import A from 'automerge'
import { RepoSnapshot } from './types'
import { Repo } from './Repo'
import { newid } from 'cevitxe-signal-client'

/**
 * DEPRECATED
 * Use Repo.getFullSnapshot
 */
export const repoToObject = <T = any>(repo: Repo<T>): RepoSnapshot<T> => {
  const result = {} as any
  for (let documentId of repo.documentIds) {
    result[documentId] = repo.get(documentId)
  }
  return result
}

/**
 * DEPRECATED
 * This is only used in tests
 */
export const repoFromObject = async (obj: any): Promise<Repo<any>> => {
  const repo = new Repo<any>('brilliant-test', `testdb-${newid()}`)
  await repo.open()
  for (let documentId of Object.getOwnPropertyNames(obj)) {
    await repo.set(documentId, A.from(obj[documentId]))
  }
  return repo
}
