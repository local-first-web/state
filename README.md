## What is this?

Cevitxe is a wrapper for a Redux store that uses
[Automerge](https://github.com/automerge/automerge)'s CRDTs to give your app offline capabilities
and secure peer-to-peer synchronization superpowers. If you are thinking about building a
local-first, distributed application, you might want to give this a try!

This project is inspired in part by these articles and videos:

- [CRDTs and the Quest for Distributed
  Consistency](https://www.youtube.com/watch?v=B5NULPSiOGw)
- [Local-first software: You own your data, in spite of the cloud](https://www.inkandswitch.com/local-first.html)
- [A web application with no web server?](https://medium.com/all-the-things/a-web-application-with-no-web-server-61000a6aed8f)

## Getting started

```bash
yarn add @cevitxe/core
```

#### Instantiate Cevitxe

```js
import { Cevitxe } from '@cevitxe/core'
import { proxyReducer } from '../reducer'
import { ALL } from '../constants'

const cevitxe = new Cevitxe({
  // See below to learn what a proxy reducer is
  proxyReducer,

  // Pass an initial state, just like you would for Redux
  defaultState: {
    todos: [],
    filter: ALL,
  },
})
```

See here [TODO] for all the options that you can pass the Cevitxe constructor.

#### Use Cevitxe to create your store

The Cevitxe object creates your Redux store. It's a plain old Redux store that you can use in your
app the way you always have.

There are two ways to get a store: You can **create** one, or you can **join** one.

Either way you need a **document ID**. This key can be any string that uniquely identifies a
document. Typically you'll use a UUID.

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

> For more details on how you would use Automerge directly, see [here](https://github.com/automerge/automerge#manipulating-and-inspecting-state).

With Cevitxe, you collect these change functions into something that looks a lot like a Redux
reducer, but has some key differences.

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

Specifically:

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

## Running the examples

## Known limitations

## Why is it called Cevitxe?
