# Cevitxe Signal Client

A simple discovery cloud client library that can be paired with [cevitxe-signal-server](https://github.com/herbcaudill/cevitxe/packages/cevitxe-signal-server) to be used as a cloud-based alternative to [discovery-swarm](https://github.com/mafintosh/discovery-swarm).

### Example

Two clients running the following

```ts
import { Repo } from 'hypermerge'

import Client from 'discovery-cloud-client'

const ram: Function = require('random-access-memory')

const repo = new Repo({ storage: ram })

const client = new Client({
  url: 'wss://fish-monger-9999.herokuapp.com',
  id: repo.id,
  stream: repo.stream,
})

repo.replicate(client)
```

### License

MIT
