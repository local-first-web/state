## How?

### Data replication & synchronization

For a distributed, local-first application to work, you need to **keep independent replicas of a
dataset in sync** with each other, without counting on an all-knowing server to serve as a single
source of truth.

- **Conflict-free replicated data types**
  ([CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)) are data structures that
  solve this problem in a way that is mathematically proven to **guarantee eventual consistency**.
- [**Automerge**](https://github.com/automerge/automerge) is a
  JavaScript library that makes it possible to turn any JSON object into a CRDT.

Automerge keeps track of a dataset's history using an append-only log of changes. You can think of
it as **Git for JSON data structures**. Different actors generate a stream of changes (analogous to
Git commits). Unlike Git, though, Automerge **automatically resolves conflicts**. Automerge's
conflict resolution is

- **arbitrary**;
- **deterministic** (two actors will always resolve any given conflict in the same way, without
  communicating with each other);
- **non-destructive** (a record of a conflict is embedded in the document's metadata, so that an
  application can surface it for human attention if necessary); and
- **rarely necessary** (conflicts only occur when two actors concurrently modify the same
  property of the same element of the same document).

Let's assume you have an application that works with one or more JSON documents. For example, a
single "document" might represent a task list, a row in a spreadsheet-like table, or a chat conversation.

`@localfirst/state` exposes a repository of documents to your application as a **Redux store**.
Internally, each one is represented by both a snapshot of its current state and a history of
Automerge changes.

### Networking

In the background, whenever you are online, `@localfirst/state` connects to any peers that are using the same
repository, sending out a stream of changes as the user modifies the dataset, and applying incoming
changes from peers.

To discover peers, you can use [@localfirst/relay](https://github.com/local-first-web/relay) service.

### Persistence

Each peer stores the entire repository locally, in the form of a complete history of changes for
each document, along with a snapshot of each document's most recent state. By default IndexedDB is
used, but you can use any of the provided adapters, or build your own.

This library currently includes the following data storage adapters:

- IndexedDb
- MongoDb
