This is a placeholder PR to propose one approach to meeting the authentication & authorization requirements specified in #37.

## Overview

**Authentication** is required by the signal server, and provided by a lightweight authentication server, which in turn relies on external OAuth providers.

**Authorization** information about roles, permissions, and authorized users is encoded in a special JSON document that is included in the repo under a reserved key. This document is included with the repository, digitally signed, and replicated in plaintext to all actors.

Permissions can be set both at the **document** level (e.g. some actors can't see agent records) and at the **field** level (e.g. some actors can't read salary data).

- Sensitive **documents** are simply never shared with unauthorized actors.

- Sensitive **fields** are encrypted using a key that is only available to authorized actors. The encrypted data is otherwise treated the same as any other data, and replicated to all actors.

All actors' changes are **digitally signed** to prove they come from that actor. Unauthorized changes by actors with read-only access to certain documents or fields are simply ignored by other actors.

## Authentication

`cevitxe-signal-server` will now require an identity verified by a new authentication microservice, `cevitxe-auth-server`. This is a very minimal service that does just two things:

1. interface with one or more external OAuth providers (e.g. Google, GitHub, or an organization's SSO)
2. interface with an external key management service

Step by step:

1. Alice tells the signal server that she has repository `raw-fish`, and that she is willing to connect with anyone who can prove they are Bob.
2. Bob connects to the signal server and says he is interested in `raw-fish`.
3. The signal server sends Bob to the auth server, which tells Bob to go to Google and come back with a token proving his identity.
4. Bob provides his credentials (password + 2FA) to Google's satisfaction.
5. Google sends Bob back to the auth server along with a JWT that can only be decrypted with a private key known to the auth server.
6. The auth server sends Bob back to the signal server along with a new JWT that includes the role-specific encryption keys he will need.
7. The signal server is now satisfied that Bob is who he says he is, and can vouch for him to Alice (and anyone else, as long as Bob's token hasn't expired)

## Authorization

### Encryption keys

This system relies on three types of keypairs:

1. **Root**: A single admin-only keypair, used to sign the access control document
2. **Role**: One per role, used to decrypt sensitive field-level data
3. **Actor**: One per actor, used to sign changes

These keys are generated and stored by the auth server, and provided to actors when they successfully authenticate.

#### Encrypting for readers with different keys

The encrypted salary data needs to be independently decrypted by users with different roles. To accomplish this, we:

1. randomly generate a symmetric key `K` that we'll use for the salary field;
2. for each role that can read salaries, use the role's public key to make an encrypted copy of `K`;
3. in the access control document, include a dictionary mapping roles to the corresponding symmetric key.

Now to decrypt salary data, an actor first finds and decrypts the key corresponding to their role; then uses that key to decrypt the data itself.

### Enforcing `read` permissions

In our example scenario, Dan isn't allowed to see agents (document-level permissions) or salaries (field-level permissions).

When Alice synchronizes with Dan, she has two ways to hide information from him:

1.  **Omission:** Alice can choose to share some documents but not others. This is how we enforce
    **document-level permissions**: Alice can share nothing but civilian records with Dan, and
    that's all he'll ever see.

2.  **Encryption:** Alice can encrypt the contents of individual fields. This is how we enforce
    **field-level permissions**: Alice can encrypt the contents of the salary field using a key that
    Dan doesn't have, but that authorized readers (Carol, Frank, and Gloria) do.

In a client/server setup, read permissions are typically enforced by omission; so that's the model we're familiar with.

In our distributed network, this works for document-level permissions. But Automerge does its magic by keeping the history of an entire document in sync. So any sensitive information _within_ a document needs to be passed around in encrypted form, such that everyone can see it's there, resolve conflicting versions, and so on; but only authorized readers can decrypt it.

### Enforcing `write` permissions

In a client/server model, enforcing write permissions is straightforward, since a central server can simply reject changes coming from unauthorized clients.

In this distributed model, changes might be passed from one actor to another several times before we receive them. Suppose Alice receives Bob's changes via Carol. She needs to be confident that Carol hasn't modified those changes before passing them on. In fact, she needs to be confident that Carol isn't making her own changes and claiming they're Bob's!

To properly enforce `write` permissions, each actor needs to digitally sign their own changes. Step by step:

1. Bob changes Aldrich Ames' salary.
2. Bob signs the change using his private key.
3. Bob goes online; Carol happens to be online as well.
4. Carol and Bob sync up; Carol receives Bob's change.
5. Carol looks up Bob's public key in the access control document and uses it to verify the signed
   change; it checks out.
6. Carol also checks the access control document to verify that Bob has write permissions for the
   salary field; he does.
7. Satisfied, Carol adds the change to her append-only log, and updates her snapshot of Aldrich's
   record.
8. Bob goes offline.
9. Alice comes online and connects to Carol.
10. Alice and Carol sync up; Alice receives Bob's change from Carol.
11. Alice verifies the signature to be sure Bob made the change, and confirms that Bob had
    permission to make the change. She updates her own records as well.

If at any point one of these checks fails - say Carol was trying to pass off her changes as Bob's, or Bob didn't have the right permissions - the receiving actor can simply ignore the change.

> In either situation, it may make sense to also raise some sort of alarm ("Bob is misbehaving", or "Carol is trying to impersonate Bob") that would be handled at the application level.

### Enforcing admin permissions

Only admins can edit the authorization rules for a repository. This is enforced by treating the access control document as read-only for anyone not in an `admin` role: Changes by unauthorized actors will be rejected by other actors.

## Revoking or downgrading permissions

> **A note about reality:** Alice has disclosed information to Bob, she can't exactly _un_-disclose it. Also, unless she has complete control over Bob's computing environment, she can't really prevent Bob from copying and/or distributing the information: He could make a backup onto a thumb drive or a cloud server, or he could send a copy to the New York Times or to the Russians, etc.
> The most any system can promise with regard to information an actor should no longer see is:
>
> - try to erase the information that we've cached or persisted on their devices
> - keep them from receiving any new information in the future

Revoking **write permissions** at any level, and **read permissions** at the **document level**, is a matter of applying the new rules going forward (and in the case of read permissions, removing the newly disallowed documents are removed from the storage we control on the actor's device).

The tricky part is revoking **read permissions** at the **field level**, because of the way we [encrypt for readers with different keys](#encrypting-for-readers-with-different-keys).

As an example, let's suppose Gloria is demoted from from `civilian-manager` to `civilian`, and as a result she should no longer see salary information.

The first thing we do is to regenerate encryption keys for the `civilian-manager` role, and we re-encrypt the salary key for `civilian-manager`. This way Gloria can no longer access the symmetric key used to encrypt salary data.

For many applications, this is be sufficient. If we're really worried, though, we need regenerate that symmetric key and re-encrypt all the salary data. (Technically Gloria has 'seen' the symmetric key, since she's decrypted it in the past any time she's needed to see salary data.)

## Access control document

We encode the information about [roles and permissions](https:_github.com_DevResults_cevitxe_issues_37#roles) and the list of [authorized actors and their roles](https:__github.com_DevResults_cevitxe_issues_37#actors) in a special JSON document that is included in the repo under a reserved key.

This document is included with the repository, digitally signed with the root key, and replicated in plaintext to all actors.

For example:

```json
{
  "CEVITXE_ACCESS-CONTROL": {
    "roles": {
      "hr": { "isAdmin": true },
      "it": { "isAdmin": true },
      "civilian-hr": {
        "documentExclusions": { "read": ["agent"] }
      },
      "civilian-manager": {
        "documentExclusions": { "read": ["agent"] },
        "fieldExclusions": { "write": ["salary"] }
      },
      "civilian": {
        "documentExclusions": { "read": ["agent"] },
        "fieldExclusions": { "read": ["salary"], "write": ["salary"] }
      },
      "auditor": {
        "fieldExclusions": { "write": "*" }
      },
      "connector": {}
    },
    "actors": {
      "Alice": { "role": "hr", "publicKey": "51abN…" },
      "Bob": { "role": "it", "publicKey": "12KK0…" },
      "Carol": { "role": "auditor", "publicKey": "4421a…" },
      "Dan": { "role": "civilian", "publicKey": "AA292…" },
      "Frank": { "role": "civilian-hr", "publicKey": "29A32…" },
      "Gloria": { "role": "civilian-manager", "publicKey": "999ZZ…" },
      "ImNotAServer": { "role": "connector", "publicKey": "39220…" }
    },
    "documentExclusions": {
      "agent": "[?(@.jobTitle!=='Agent')]"
    },
    "fieldExclusions": {
      "salary": {
        "path": "salary",
        "keys": {
          "hr": "g*Lß|º}þbóüA…",
          "it": "¹6úí*zïóYÜáQÒ…",
          "civilian-hr": "?26ïtm#êéH)…",
          "auditor": "JR¢L²ÈÜ<ë3?&^Ù…"
        }
      }
    },
    "signature": "skdfDSFJD23847…"
  }
  // ... repository documents follow
}
```

> Note: In the examples, we're referring to actors and roles using readable names like `Alice` and `civilian`. In practice, we can avoid leaking information by using random IDs for both. The human-readable labels can be linked to those IDs in a separate system, or included in the document itself as encrypted metatada.
>
> ```js
> "actors": {
>   "123abc": {
>     "name": "$§1k±ÕáÒ", // "Alice", encrypted
>     "role": "hr",
>     "publicKey": "51abN…"
>   },
>   //...
> ```

### Schema

An access control document has the following root-level elements:

#### `roles`

Dictionary mapping unique IDs to role definitions. A role definition can have the following elements:

- `isAdmin` (boolean; defaults to `false`) indicates a role with no read or write restrictions, and with the ability to modify the access control document.

  ```js
    "hr": { "isAdmin": true }
  ```

  Normally this

- `documentExclusions` and `fieldExclusions` (object; defaults to `{}`) has `read` and `write` properties, each of which is set to an array of keys from the root-level `documentExclusions` and `fieldExclusions`, respectively.

  ```js
  "civilian": {
    "documentExclusions": { "read": ["agent"] },
    "fieldExclusions": { "read": ["salary"], "write": ["salary"] }
  },
  ```

#### `actors`

Dictionary mapping unique actor IDs to actor definitions. An actor definition can have the following elements:

- `role` is a reference to a role ID from the `roles` element.
- `publicKey` is the shared half of a keypair selected by the actor.

<!-- TODO: how/when is the actor's keypair set?  -->

```js
"actors": {
  "Alice": { "role": "hr", "publicKey": "51abN…" },
  "Bob": { "role": "it", "publicKey": "12KK0…" },
  "Carol": { "role": "auditor", "publicKey": "4421a…" },
  // ...
}
```

#### `documentExclusions`

Dictionary mapping exclusion IDs to [JSONPath](https://www.npmjs.com/package/jsonpath) filter expressions.

```js
"documentExclusions": {
  "agent": "[?(@.jobTitle!=='Agent')]"
},
```

#### `fieldExclusions`

Dictionary mapping exclusion IDs to field exclusion definitions. A field exclusion definition has two elements:

- `path` is a JSONPath expression identifying the sensitive property. For properties at the root of the document, this will just be the name of the property.
- `keys` is a dictionary mapping TODO

```js
"fieldExclusions": {
  "salary": {
    "path": "salary",
    "keys": {
      "hr": "g*Lß|º}þbóüA…",
      "it": "¹6úí*zïóYÜáQÒ…",
      "civilian-hr": "?26ïtm#êéH)…",
      "auditor": "JR¢L²ÈÜ<ë3?&^Ù…"
    }
  }
```

#### `signature`

The entire access control document is signed with the repository's root private key, and can be verified against the repository's root public key (provided by the signal server when connecting peers).
