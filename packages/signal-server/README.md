# Cevitxe Signal Server

For usage, see the client portion at
[cevitxe-signal-client](https://github.com/orionz/discovery-cloud-client).

## Setup

### Heroku

This app is intended to be deployable to Heroku out of the box and require no configuration. By its
design it should only ever run with a single dyno as there's no backplane for processes to
communicate with each other.

```
  $ heroku create
  Creating app... done, ⬢ fish-monger-9999
  https://fish-monger-9999.herokuapp.com/ | https://git.heroku.com/fish-monger-9999.git
  $ git push heroku master
```

### Glitch

This server can run on [Glitch](https://glitch.com); just remix the
[**discovery-cloud**](https://glitch.com/edit/#!/remix/discovery-cloud) project.

## LICENSE

MIT

Based on https://github.com/orionz/discovery-cloud-server
