// Custom override lib for extending Automerge as needed
// Typically these alterations are temporary, usually awaiting PRs to Automerge proper
import A from 'automerge'

export class DocSet<T> extends A.DocSet<T> {
  constructor() {
    super()
  }

  public removeDoc(docId: string): void {
    // @ts-ignore
    this.docs = this.docs.delete(docId)
  }
}
