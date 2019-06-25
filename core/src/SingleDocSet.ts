import automerge from 'automerge'

// The `automerge.Connection` class takes an `automerge.DocSet`, which is designed to manage
// multiple documents. At this point we're only using a single document, so rather than have to keep
// track of a consistent document ID everywhere we just use this thin wrapper that just exposes a
// single document via `singleDocSet.set` and `singleDocSet.get`. The underlying `DocSet` is
// available as `singleDocSet.base`.

export class SingleDocSet<T> {
  // This could be anything
  private DOC_ID = '1'

  // The underlying DocSet is available as `base`, for properties that we're not otherwise exposing
  public base: automerge.DocSet<T>

  // example: `const docSet = new SingleDocSet(state)`
  constructor(doc: T) {
    this.base = new automerge.DocSet()
    this.set(doc)
  }

  // example: `docSet.set(state)`
  public set(doc: T) {
    this.base.setDoc(this.DOC_ID, doc)
  }

  // example: `const newState = docSet.get()`
  public get() {
    return this.base.getDoc(this.DOC_ID)
  }
}
