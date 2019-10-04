import A from 'automerge'
type DocSetHandler<T> = (docId: string, doc: A.Doc<T>) => void

export class DocSet<T = any> {
  private docs: Map<string, A.Doc<T>>
  private handlers: Set<DocSetHandler<T>>

  constructor() {
    this.docs = new Map()
    this.handlers = new Set()
  }

  get docIds() {
    return this.docs.keys()
  }

  getDoc(docId: string) {
    return this.docs.get(docId)
  }

  removeDoc(docId: string) {
    this.docs.delete(docId)
  }

  setDoc(docId: string, doc: A.Doc<T>) {
    this.docs = this.docs.set(docId, doc)
    this.handlers.forEach(handler => handler(docId, doc))
  }

  applyChanges(docId: string, changes: A.Change[]) {
    // @ts-ignore
    let doc = this.docs.get(docId) || A.Frontend.init({ backend: A.Backend })
    const oldState = A.Frontend.getBackendState(doc)
    const [newState, patch] = A.Backend.applyChanges(oldState, changes)
    // @ts-ignore
    patch.state = newState
    doc = A.Frontend.applyPatch(doc, patch)
    this.setDoc(docId, doc)
    return doc
  }

  registerHandler(handler: DocSetHandler<T>) {
    this.handlers.add(handler)
  }

  unregisterHandler(handler: DocSetHandler<T>) {
    this.handlers.delete(handler)
  }
}
