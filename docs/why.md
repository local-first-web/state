## Why?

### Peer-to-peer, offline-first applications...

There are a lot of reasons to build an app that works in a distributed way, without depending on a centralized server:

- Suppose you want to build a web application where the **data doesn't live on a remote host**, but
  is shared from **peer to peer**.

- Or, you want to create an app that **works offline**, and **syncs up** with changes by other users
  when it comes back online.

- Or, you want to go **local-first** to **eliminate latency**, by keeping a complete copy of a
  user's data on their machine, which you then replicate to other users in the background.

<table>
<tr>
<td><img src='../images/008.jpg' /> 
<p>A typical client-server application</p>
</td>
<td><img src='../images/023.jpg' />
<p>A distributed (peer-to-peer) application</p>
</td>
</tr>
</table>

### ...using the familiar Redux API

A typical web application developer today is likely to be comfortable working with databases and API
endpoints on the server, along with state containers like [Redux](https://redux.js.org/) on the client.

A distributed architecture is compelling for all the reasons listed above, but it puts us in very
unfamiliar territory. Without a server, how do peers talk to each other? Where is the data stored?
How do we make sure that concurrent (and possibly conflicting) changes get replicated correctly
between peers?

Cevitxe intends to **bridge that gap** by combining the **familiar interface** of a Redux store with
**peer-to-peer networking**, **offline capabilities**, and **automatic synchronization** and conflict
resolution superpowers.
