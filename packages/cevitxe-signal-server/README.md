# Cevitxe Signal Server

This server provides two services:

- **Introduction** (aka discovery): A client can provide one or more document keys that they're
  interested in. If any other client is interested in the same key or keys, each will receive
  an `Introduction` message with the other's id. They can then use that information to connect.

- **Connection**: Client A can request to connect with Client B on a given document ID (can
  think of it as a 'channel'). If we get matching connection requests from A and B, we just pipe
  their sockets together.

## Usage

The client that we've written for this server is the easiest way to use it. See the instructions for
[cevitxe-signal-client](https://github.com/devresults/cevitxe/packages/../../../../../../cevitxe-signal-client/README.md) for details.

## API

This server has two WebSocket endpoints: `introduction` and `connect`.

#### `/introduction/:localId`

- I connect to this endpoint, e.g. `wss://your.domain.com/introduction/aaaa4242`.

  - `:localId` is a string that identifies me uniquely

- Once a WebSocket connection has been made, I send an introduction request containing one or more document IDs I'm interested in joining:

  ```ts
  {
    type: 'Hello',
    id: 'aaaa4242', // my id (same as `localId`)
    join: ['abc123', 'qrs987'], // documents I'm interested in
  }
  ```

- If another peer is connected to the same server and interested in one or more of the same documents IDs, the server sends me an introduction message:

  ```ts
  {
    type: 'Introduction',
    id: 'bbbb6666', // the peer's id
    keys: ['abc123'] // documents we're both interested in
  }
  ```

- I can now use this information to request a connection to this peer.

#### `/connect/:remoteId`

- I make a new connection to this endpoint, e.g. `wss://your.domain.com/connect/bbbb6666`.

  - `:localId` is my unique ID, same as above
  - `:remoteId` is theirs

-

TODO: Clean up this API.

- Is there any need to pass info in the URL if we're passing it in the body?
- Are we using message names consistently? Do we need them?

The [tests](https://github.com/DevResults/cevitxe/blob/master/packages/cevitxe-signal-server/src/Server.test.ts) for the

## Deployment

The easiest way to stand one of these up is to use the https://github.com/DevResults/cevitxe-signal-server-standalone repo, which avoids monorepo wrangling. In that repo you'll find instructions for deploying to Heroku, AWS Elastic Beanstalk, Google Cloud Platform, and Glitch.

## License

MIT

## Prior art

Inspired by https://github.com/orionz/discovery-cloud-server
