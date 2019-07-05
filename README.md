![cevitxe logo](logo.svg)

## In progress

> ⚠ This package isn't ready for production use!

Still to do:

- [x] Add grid example
- [x] Add chat example
- [ ] Add instructions for running examples
- [ ] Add known limitations
- [ ] Fix initial key workflow
- [ ] Straighten out initial state
- [ ] Don't mock webrtc-swarm
- [ ] Add fallback for webrtc

## What is this?

Cevitxe is a wrapper for a Redux store that uses
[Automerge](https://github.com/automerge/automerge)'s CRDTs to give your app offline capabilities
and secure peer-to-peer synchronization superpowers. If you are thinking about building a
local-first, distributed application, you might want to give this a try!

## How does it work?

Let's assume you have an application that works with one or more JSON documents. For example, a
single "document" might represent a to-do list, a spreadsheet table, or a chat conversation.

Cevitxe exposes a document to your application as a Redux store. Internally, the document state is
managed by Automerge, which translates the user's changes into an append-only log of changes.

- **Persistence** This history is stored locally, along with a snapshot of a recent state. By
  default IndexedDB is used, but you can use any storage provider that implements the
  [`random-access-storage`](https://github.com/random-access-storage) interface.

- **Networking** In the background, whenever you are online, Cevitxe keeps your state synchronized
  with any other peer instances of your application that are using the same document. To discover
  peers outside your network, you'll need a [signal hub](https://github.com/mafintosh/signalhub),
  which you can easily deploy yourself. (There are also [publicly available signal
  hubs](https://github.com/mafintosh/signalhub#publicly-available-signalhubs) that you can use while
  experimenting; in production, of course, you should use hubs that you control.)

## Getting started

#### Add Cevitxe as a dependency

```bash
yarn add @cevitxe/core
```

#### Instantiate Cevitxe

A typical app just needs one instance of Cevitxe, which can be used to manage any number of
documents.

```js
import { Cevitxe } from '@cevitxe/core'
import { proxyReducer } from '../reducer'
import { ALL } from '../constants'

const cevitxe = new Cevitxe({
  // See below to learn what a proxy reducer is
  proxyReducer,

  // Pass an initial state, just like you would for Redux
  defaultState: {
    todoList: [],
    todoMap: {},
    filter: ALL,
  },

  // Point it to known signal hub instances
  // see https://github.com/mafintosh/signalhub
  peerHubs: [
    'https://signalhub.myapplication.com/',
    'https://signalhub-jccqtwhdwc.now.sh/', //..
  ],
})
```

[TODO] example with all the options that you can pass the Cevitxe constructor

#### Use Cevitxe to create your store

The Cevitxe object creates your Redux store. It's a plain old Redux store that you can use in your
app the way you always have.

There are two ways to get a store: You can **create** one, or you can **join** one.

Either way you need a **document ID**. This key can be any string that uniquely identifies a
document. Typically this is a UUID, but it doesn't have to be as long as you're confident it's
unique. It's your app's responsibility to give the user the option of creating a new document or
joining an existing one, and managing the keys associated with documents.

```js
export const App = () => {
  // if you're creating a store
  const store = cevitxe.createStore(documentId)

  // OR if you're joining a store
  // const store = cevitxe.joinStore(documentId)

  return (
    <Provider store={store}>
      <App />
    </Provider>
  )
}
```

#### Proxy reducers for Automerge are different from ordinary Redux reducers

Automerge and Redux both treat state as immutable, but use different mechanisms for modifying state.

Redux reducers take a previous state object and an action, and return a new state object.

```js
const reducer = (state, {type, payload}) =>
  switch (type) {
    case SET_FILTER:
      return {
        ...state
        filter: payload.filter
      })

    case ADD_TODO: {
      const { id, content } = payload
      return {
        ...state,
        todoList: state.todoList.concat(id),
        todoMap: {
          ...state.todoMap,
          [id]: {
            content: content,
            completed: false,
          },
        }
      }
    }

    // ... etc.

    default:
      return state

  }
}
```

In an Automerge change callback, you're given a
[proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to
the current state. Inside the callback, you modify the state as if it were mutable. You don't need
to return anything; Automerge translates your modifications to a set of changes, and uses that to
construct the new state.

If you were using Automerge directly, this is what that would look like:

```js
newState = A.change(prevState, s => {
  // `s` is a mutable proxy to the contents of `prevState`
  s.filter = someNewValue
})
```

(For more details on how you would use Automerge directly, see [here](https://github.com/automerge/automerge#manipulating-and-inspecting-state).)

With Cevitxe, you collect these change functions into something that looks a lot like a Redux
reducer.

```js
const proxyReducer = ({ type, payload }) => {
  switch (type) {
    case SET_FILTER:
      return state => (state.visibilityFilter = payload.filter)

    case ADD_TODO: {
      const { id, content } = payload
      return state => {
        state.todoList.push(id)
        state.todoMap[id] = { id, content, completed: false }
      }
    }

    // ... etc.

    default:
      return null
  }
}
```

But there are three important differences between a proxy reducer and an ordinary Redux reducer:

- A Redux reducer's signature is `(state, action) => state`: You take the old state and an action,
  and you return the new state. The proxy reducer's signature is `action => state => void`: You take
  the action and return a **change function**, which in turn recieves a proxy to the old state. You
  modify the proxy, and the proxy communicates the changes you make to the framework.
- The fallthrough case in a proxy reducer is `null` (no change function found), rather than the original
  `state` value.
- Since you don't need to return anything, you don't need to reconstruct all the bits of the state
  tree that aren't affected by any given reducer. In Redux you might end up having to do something
  like this to modify a deeply nested bit of state while leaving the rest unchanged:

  ```js
  case TOGGLE_TODO: {
    const { id } = payload
    return {
      ...state,
      todoMap: {
        ...state.todoMap,
        [id]: {
          ...state.todoMap[id],
          completed: !state.todoMap[id].completed,
        },
      }
    }
  }
  ```

  A proxy reducer just modifies what it needs to:

  ```js
    case TOGGLE_TODO: {
      const { id } = payload
      return state => (state.todoMap[id].completed = !state.todoMap[id].completed)
    }
  ```

Internally, Cevitxe turns the proxy into a straight-up Redux reducer.

## Running the examples

## Known limitations

## Frequently asked questions

### Where can I learn more about this whole CRDT/distributed/local-first thing?

Here are some articles and videos:

- [CRDTs and the Quest for Distributed
  Consistency](https://www.youtube.com/watch?v=B5NULPSiOGw), a great talk by [Martin Kleppman](@ept), the
  author of Automerge.
- [Local-first software: You own your data, in spite of the
  cloud](https://www.inkandswitch.com/local-first.html), a manifesto published by Ink & Switch, the
  industrial research lab created by Heroku alumni that is behind Automerge.
- [A web application with no web server?](https://medium.com/all-the-things/a-web-application-with-no-web-server-61000a6aed8f)

### Why is this package called Cevitxe?

[CVI.CHE 105](https://www.google.com/search?q=cvi.che+105&tbm=isch) is a restaurant in Miami, where
the authors of this package ate the night before starting it.

[Ceviche](https://en.wikipedia.org/wiki/Ceviche) is the Peruvian style of preparing raw fish
marinated in citrus along with _ají_, onions, and cilantro.

[Cevitxe](https://www.facebook.com/bentrobats/videos/1492898280822955/) is the Catalan spelling of
the same word, and is pronounced the same way.

Why the Catalan spelling?

- @herbcaudill lives in Barcelona
- The name was free on NPM
- It's easier to Google
- It has an **x** like Redu**x**.

```
        C R D T
        E
        V
        I
        T
R E D U X
        E
```
