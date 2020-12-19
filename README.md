<img src='https://raw.githubusercontent.com/local-first-web/branding/main/svg/state-h.svg'
width='600' alt="@localfirst/state logo" />

`@localfirst/state` is **an automatically replicated Redux store** that gives your app offline
capabilities and secure peer-to-peer synchronization superpowers.

> 🚧 **Work in progress**

## Why

Distributed, offline-first technologies are promising for a lot of reasons, but they're unfamiliar
to most web application developers. This library provides offline storage and peer-to-peer
synchronization capabilities, and exposes them via a familiar Redux store that can be used in a
vanilla JS, React, or Electron application.

🡒 [Read more](docs/why.md)

## What

This library provides two services:

- **Data replication & synchronization**, using the
  [Automerge](https://github.com/automerge/automerge) library
- **Persistence** to a local or remote data store. You can use the provided adapters for
  [IndexedDb](../packages/storage-indexeddb) or
  [MongoDb](../packages/storage-mongodb), or provide your own.

🡒 [Read more](docs/how.md)

## How

### Example apps

Two demo React applications are included:

<table>
  <tr>
    <td>
      <h4><code>todo</code></h4>
      <img src='images/screen.todo.png'  width='400' /> 
      <p>An implementation of TodoMVC</p> 
      <p>To run: <code>yarn dev:todo:start</code> </p> 
    </td>
    <td>
      <h4><code>grid</code></h4>
      <img src='images/screen.grid.png' width='400' /> 
      <p>A simple table editor</p> 
      <p>To run: <code>yarn dev:grid:start</code> </p>
    </td>
  </tr>
</table>

### Getting started

```bash
yarn add @localfirst/state
```

```js
import { StoreManager } from '@localfirst/state'
import { Provider } from 'react-redux'

const storeManager = new StoreManager({
  // Pass your reducers
  proxyReducer,

  // Pass an initial state, just like you would for Redux
  initialState: {
    todoList: [],
    todoMap: {},
    filter: ALL,
  },
})

export const Index = () => {
  // Obtain a Redux store
  const store = storeManager.createStore(discoveryKey)
  return (
    // Pass the store to your app
    <Provider store={store}>
      <App />
    </Provider>
  )
}
```

🡒 [More on how to use `@localfirst/state` in your app](docs/getting-started.md)

### Limitations

This library requires that the entire repository be present on each peer's machine. That means that
it is limited to datasets that can fit comfortably within the disk space on a single computer. In
2019, that means something on the order of 1-10 GB.

### Further reading

- [CRDTs and the Quest for Distributed Consistency](https://www.youtube.com/watch?v=B5NULPSiOGw), a
  great talk by [Martin Kleppman](@ept), the author of Automerge.
- [Local-first software: You own your data, in spite of the
  cloud](https://www.inkandswitch.com/local-first.html), a manifesto published by Ink & Switch, the
  industrial research lab created by Heroku alumni that is behind Automerge.
- [A web application with no web
  server?](https://medium.com/all-the-things/a-web-application-with-no-web-server-61000a6aed8f)

### Alternatives

All of these projects are working in similar problem space, in JavaScript. All work in Node.js and
the browser unless otherwise noted.

- [Hypermerge](inkandswitch/hypermerge) is the semi-official networking and persistence stack for
  Automerge, based on the [DAT project](http://dat.foundation)'s
  [Hypercore](http://github.com/mafintosh/hypercore) and created by the team at Ink and Switch. It's
  used in sample Automerge applications like [Capstone](http://github.com/inkandswitch/capstone) and
  [Farm](http://github.com/inkandswitch/farm). Node.js only.
- [PouchDb](https://pouchdb.com) Syncs with [Apache CouchDb](https://couchdb.apache.org).
- [Realm Database](https://realm.io/products/realm-database/) Acquired by MongoDB in 2019. Node.js
  only.
- [HyperDB](https://github.com/mafintosh/hyperdb) From the DAT Project. Showcased in a cool sample
  app by @jimpick: [Dat Shopping List](https://blog.datproject.org/2018/05/14/dat-shopping-list/).
- [GunDB](https://gun.eco) Distributed graph database.
