import A from 'automerge'
export type DocSetHandler<T> = (documentId: string, doc: A.Doc<T>) => void

export class DocSet<T = any> {
  private docs: Map<string, A.Doc<T>>
  private handlers: Set<DocSetHandler<T>>

  constructor() {
    this.docs = new Map()
    this.handlers = new Set()
  }

  get documentIds() {
    return this.docs.keys()
  }

  getDoc(documentId: string) {
    return this.docs.get(documentId)
  }

  removeDoc(documentId: string) {
    this.docs.delete(documentId)
  }

  setDoc(documentId: string, doc: A.Doc<T>) {
    this.docs = this.docs.set(documentId, doc)
    this.handlers.forEach(handler => handler(documentId, doc))
  }

  applyChanges(documentId: string, changes: A.Change[]) {
    // automerge.d.ts doesn't include `backend` as an init option
    // @ts-ignore
    let doc = this.docs.get(documentId) || A.Frontend.init({ backend: A.Backend })

    const oldState = A.Frontend.getBackendState(doc)
    const [newState, patch] = A.Backend.applyChanges(oldState, changes)

    // automerge.d.ts doesn't have Patch.state
    // @ts-ignore
    patch.state = newState

    doc = A.Frontend.applyPatch(doc, patch)
    this.setDoc(documentId, doc)

    return doc
  }

  registerHandler(handler: DocSetHandler<T>) {
    this.handlers.add(handler)
  }

  unregisterHandler(handler: DocSetHandler<T>) {
    this.handlers.delete(handler)
  }
}
