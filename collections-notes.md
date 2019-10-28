## Why do we have collections in the first place?

At first we were using a single Automerge document to store everything, and the API was very simple: You just figured out a JSON structure for your entire state and passed it in. So, for example:

```js
const state = {
  settings: {...},
  teachers: {
    abc123: {...},
    qrs666: {...},
  },
  students: {
    def987: {...},
    xyz007: {...},
  },
}
```

The problem was that no individual document can support hundreds of thousands of anything. In order to be able to scale, we switched to using multiple Automerge documents in a DocSet. So anything that you might have "a lot of" had to live at the root. Our first attempt looked something like this:

```js
const state = {
  settings: {...},
  teachers: ['abc123', 'qrs666'],
  students: ['def987', 'xyz007'],
  abc123: {...},
  qrs666: {...},
  def987: {...},
  xyz007: {...},
}
```

This worked, but the index documents `teachers` and `students` were still problematic: Even a document containing nothing but an array of keys would use up the whole Javascript heap at some point between 100K and 1M items.

So we came up with a scheme that used a naming convention to keep collections separate without requiring an index - something like this:

```js
const state = {
  settings: {...},
  teacher_abc123: {...},
  teacher_qrs666: {...},
  student_def987: {...},
  student_xyz007: {...},
}
```

This also worked, but now we have to write a lot of code to do simple things like

- get a list of all items in a collection
- convert an item's ID (e.g. `abc123`) to the collection key (e.g. `teacher_abc123`) and vice-versa
- delete an item

Deleting items in particular was tricky without an index: We want deletions to replicate across peers, but without an index, we had to come up with a complicated scheme involving a magical `__DELETED` property.

The `collection` object wraps that complexity by providing helpers for CRUD functions. In reducers, you can do this:

```ts
const { add, update, remove, drop } = collection('rows').reducers
switch (type) {
  case actions.ITEM_ADD:
    return add(payload)
  case actions.ITEM_UPDATE:
    return update(payload)
  case actions.ITEM_REMOVE:
    return remove(payload)
  case actions.COLLECTION_CLEAR:
    return drop()
  // ...
}
```

To access the items in a collection, you have selectors that will give them to you as an array or as a map:

```ts
const rowArray = collection('rows').selectors.getAll(state)
const rowMap = collection('rows').selectors.getMap(state)
```

## What don't we like about this?

This entire API came from the requirement to handle datasets too large to fit into browser memory.

But many applications (most applications?) don't involve huge datasets, and can benefit from the simplicity that comes from having the entire application's state in a single in-memory JSON object. For these use cases, the current API is really cumbersome. (See also #40.)

I also worry that we're drifting farther and farther the standard Redux API that developers are likely to be familiar with.

Even in applications that _do_ have multiple large collections, this API feels awkward. Every time I come back to it I have to re-read the docs I wrote earlier. I think we can make the DX for this use case a little more ergonomic without making big changes.

## Why do we have more options now than when we created this interface?

We created this setup to work within the limitations of an `Automerge.DocSet`. This is a very simple in-memory key/value structure that contains Automerge documents and fires events when any document is added or changed.

We now use the `Repo` object, which is basically a `DocSet` that takes a storage adapter to persist its contents. Rather than dealing directly with Automerge documents all the time, a `Repo` manages change histories, vector clocks, and snapshots, only rehydrating an Automerge document when necessary.

Since we no need to represent all our data as root-level items in a `DocSet`, we can rethink this API so that it handles both use cases - simple in-memory state and large datasets - without developer headaches.

## What might a better interface look like?

In my ideal world, we can go back to something more like a plain-vanilla Redux API. A developer can structure their state document in a familiar way, and just indicate which elements need the "collections" treatment when initializing the store. Something like this:

```ts
const initialState = {
  settings: { schoolName: 'My new school', defaultTheme: 'dark' },
  teachers: {}, // <-- every teacher will be a separate Automerge doc, but I don't need to think about that
  students: {}, // <-- same deal with students
}

export const storeManager = new StoreManager({
  databaseName: 'school',
  collections: ['teachers', 'students'], // <-- I just have to indicate what needs to be treated as collections
  proxyReducer,
  initialState,
})
```

### Regular objects

For anything that isn't part of a collection, the API is straight-up Redux.

#### Selectors

```ts
const defaultTheme = useSelector(state => state.settings.defaultTheme)
```

#### Reducers

Reducers still [use Automerge change functions](http://github.com/DevResults/cevitxe#proxy-reducers-for-automerge-are-different-from-ordinary-redux-reducers) instead of standard Redux pure functions, but we can just return a single function instead of a dictionary of functions:

```ts
case actions.CHANGE_DEFAULT_THEME:
  return state => state.defaultTheme = payload
//...
```

### Collections

#### Selectors

To read data from collections, we use the `collection.selector` function, which takes a state object and returns a dictionary of collections. Each one of these offers an interface designed to mimic an ES6 `Map`, but with asynchronous accessors:

```ts
const { teachers } = collection.selector(state)

// get a single record
const teacher = await teachers.get(id)

// check for existence of a record
if (await teachers.has(id)) {
  //...
}

// count records
const n = await teachers.size

// loop through keys
for await (const id of teachers.keys()) {
  //...
}

// loop through values
for await (const teacher of teachers.values()) {
  //...
}
```

#### Reducers

Since each item in a collection is a separate Automerge document, the reducers for collection items still need to return a dictionary of functions, keyed to the item id (the way they do now).

We can do this by hand:

```ts
case actions.UPDATE_TEACHER:
  const { id, teacher } = payload
  return {
    id: s => ({...s, ...teacher})
  }
```

Or we can use helpers provided by the `collection` object:

```ts
const { teachers } = collection.reducers(state)
switch (type) {
  case actions.UPDATE_TEACHER:
    return teachers.update(payload)
  //...
}
```

### Implementation

The underlying implementation of collections will be up to the `StorageAdapter`. For example, for the `IdbAdapter` we might consider the following options:

1. create separate `changes` and `snapshots` object stores for each collection, e.g. `changes_teachers` and `snapshots_teachers`
2. store each collection in a separate database
3. leave everything jumbled up together, but persist special collection index documents indicating which documents belong to which collections
4. store everything in the existing `changes` and `snapshots` object stores, and add an indexed `collection` field to the containing record
5. etc.

I'd probably lean towards option 4 for IndexedDB, but different approaches will make sense for different persistence technologies. The point is that at the API level we don't need to care about the implementation details.
