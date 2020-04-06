## Getting started

### Running the examples

Two demo React applications are included. Source code is in the `examples` directory. You can run
each one with the appropriate `yarn start` command:

| `yarn start:grid`                                | `yarn start:todo`                                 |
| ------------------------------------------------ | ------------------------------------------------- |
| <img src='images/screen.grid.png' width='600' /> | <img src='images/screen.todo.png'  width='600' /> |
| <sub>A simple table editor</sub>                 | <sub>An implementation of TodoMVC</sub>           |

If you are working on the Cevitxe code and/or the code for one of the demo apps, you can start in
watch mode by running `yarn dev` instead:

- `yarn dev:grid`
- `yarn dev:todo`

In each case the app will run on `localhost:3000`. (You can only run one example app at a time).

To test the peer-to-peer functionality on a single computer, visit the demo in two different
browsers (e.g. Chrome and Firefox), or with a normal window and an incognito window of the same
browser.

(You can of course run in two normal tabs of the same browser, but they'll share the local
IndexedDb, so you're not really testing their ability to communicate.)

Copy the ID from one browser window and paste it into the other, then press **Join**.
After a brief delay, you should have the same state visible in both instances, and changes made in
one should be replicated to the other.

![](images/demo.gif)

## Getting started

Cevitxe works in the **browser** and in **Node.js**. The examples given are React apps, and the Toolbar
component they all use is a React component. The store that Cevitxe exposes is a Redux store; it can
be used by any JavaScript application, not just those using React.

> **TODO:** once we settle on a better collections API, update docs to show how this would be used
> with a single state document, and how it would be used with a collection

#### Add Cevitxe as a dependency

```bash
yarn add cevitxe
```

#### Instantiate Cevitxe

A typical app just needs one instance of Cevitxe, which can be used to manage any number of
documents.

```js
import { StoreManager } from 'cevitxe'
import { proxyReducer } from '../reducer'
import { ALL } from '../constants'

const cevitxe = new Cevitxe({
  // See below to learn what a proxy reducer is
  proxyReducer,

  // Pass an initial state, just like you would for Redux
  initialState: {
    todoList: [],
    todoMap: {},
    filter: ALL,
  },

  // Point it to known signal server instances
  peerHubs: [
    'https://signalserver.myapplication.com/',
    'https://signalserver-qrsxyz.now.sh/', //..
  ],
})
```

> **TODO:** example with all the options that you can pass the Cevitxe constructor

#### Use Cevitxe to create your store

The Cevitxe object creates your Redux store. It's a plain old Redux store that you can use in your
app the way you always have.

There are two ways to get a store: You can **create** one, or you can **join** one.

Either way you need a **discovery key**. This key can be any string that uniquely identifies a
document. Typically this is a UUID, but it doesn't have to be as long as you're confident it's
unique. It's your app's responsibility to give the user the option of creating a new document or
joining an existing one, and managing the keys associated with documents.

```js
export const App = () => {
  // if you're creating a store
  const store = cevitxe.createStore(discoveryKey)

  // OR if you're joining a store
  // const store = cevitxe.joinStore(discoveryKey)

  return (
    <Provider store={store}>
      <App />
    </Provider>
  )
}
```

#### Proxy reducers for Automerge are different from ordinary Redux reducers

Automerge and Redux both treat state as immutable, but use different mechanisms for modifying state.

Redux reducers take a previous state object and an action, and construct a new state object to return.

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
newState = A.change(prevState, (s) => {
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
      return (state) => (state.visibilityFilter = payload.filter)

    case ADD_TODO: {
      const { id, content } = payload
      return (state) => {
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

- A **Redux reducer**'s signature is `(state, action) => state`: You take the old state and an action,
  and you **return the new state**. The **proxy reducer**'s signature is `action => state => void`: You take
  the action and **return a change function**, which in turn recieves a proxy to the old state. You
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
