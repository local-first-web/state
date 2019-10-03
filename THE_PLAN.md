# Where do we go from here

## What works well

- Documents can be created and edited offline with zero latency and no need for a server.
- Documents can be shared with remote peers using only a tiny, generic signal/relay server.
- Synchronization of changes across multiple peers, whether online & real-time, or offline &
  concurrent, "just works".
- Performance is good both for loading documents from storage and synchronizing changes with peers.
- All data is encrypted at rest.
- Once a dataset is loaded, browsing through the data and making changes is smooth and fast, even
  with very large datasets.

## Limitations

### Dataset size

Currently we have a hard limit on dataset size, imposed by the combination of two factors:

1. Our current design requires us to load and parse the entire dataset into browser memory at once
2. Automerge adds metadata and history to each record, which increases our memory requirements to 30
   times the size of the underlying data.

We can currently work comfortably with datasets up to about 50,000 rows (using rows containing 12
fields of various types, about 1 KB of raw data). The most we've been able to load without running
out of browser memory is 100,000 rows.

### Consistency

Actions are not transactional.

Example: A changes field X from STRING to NUMBER. B sets X to a string value.

This is just the way things are for distributed, auto-merged documents.

## Proposed architectural changes

### Premises

- The UI shouldn't have to load everything into memory
- Slow operations should happen in a worker
- Document history should only be loaded when a document is edited, not for display
- Communication between the UI and the worker should happen through actions and queries (avoid
  accessing the entire state)

### Persistent storage

Currently, we persist a single append-only feed of all changes to all documents. Instead:

- Have one feed per document
- Store the latest snapshot for each document

This way, documents can be loaded instantly (using simple queries and indexes on the snapshot
collection), and the feed is loaded only for edits (local or remote)

### Networking

When a new document is seen from a peer, the snapshot should be retrieved first so it can be displayed
before downloading the change history.

When joining a discovery key for the first time, all the snapshots should be retrieved before getting the change history
for any of them. This should happen in as few messages as possible to reduce lag.

### Worker

All the Automerge, local storage and sync components live in the worker, thus freeing the UI context
of all the expensive overhead of the system

There will be a coarse-grained query API to query and retrieve a view of a set of rows, aggregate
information, etc

- v1: order + range / count(\*)
- v2: filter
- v3: \* (aggregation, projection, w/e. Might be entirely out of scope)

The actions are still the ones we've defined earlier in the project.

### UI

Data retrieval for the grid will be changed to use a server-side model, as defined by AgGrid, where
the worker takes the place of the server.

The UI should only retrieve what's needed to be displayed on the screen at any given time.

## Workplan

1. Per-document storage
   - Do storage ourselves instead of relying on hypercore
   - Merge DocSet and StorageFeed into single object
2. Run store in worker
3. Query API + paged datasets in AgGrid

Note:
