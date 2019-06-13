## What is this

This is a Redux extension that gives your store secure peer-to-peer synchronization superpowers. If you are trying to build a local-first, distributed application, you might want to give this a try!

## Getting started

#### 1. Pass your store to the Cevitxe feed

#### 2. Add Cevitxe as middleware

#### 3. Adjust any existing Redux reducers to work with Automerge objects (if you have them)

Redux reducers take a previous state object and an action, and return a new state object.

```typescript
const reducer = (state, {type, payload}) =>
  switch (type) {
    case SET_FILTER:
      return {
        ...state
        filter: payload.filter
      })
  }
}
```

To modify an Automerge object, you use the `change` method. Inside that you treat the state you're given as mutable. You don't need to return anything; the modified object is the return value of `automerge.change`.

```typescript
newState = automerge.change(prevState, s => {
  // `s` is a mutable proxy to `prevState`
  s.foo = 'pizza'
})
```

So your

## Running the examples

## Known limitations

## Why is it called Cevitxe
