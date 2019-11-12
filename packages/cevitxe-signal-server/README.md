# Cevitxe Signal Server

For usage, see the client portion at
[cevitxe-signal-client](https://github.com/devresults/cevitxe/packages/../../../../../../cevitxe-signal-client/README.md).

## Setup

### Heroku

This app is intended to be deployable to Heroku out of the box. By its design it should only ever
run with a single dyno.

```bash
$ heroku create signal-server-001
Creating ⬢ signal-server-001... done
https://signal-server-001.herokuapp.com/ | https://git.heroku.com/signal-server-001.git

$ heroku buildpacks:add -a signal-server-001 https://github.com/heroku/heroku-buildpack-multi-procfile
Buildpack added. Next release on signal-server-001 will use https://github.com/heroku/heroku-buildpack-multi-procfile.

$ heroku buildpacks:add -a signal-server-001 https://github.com/heroku/heroku-buildpack-nodejs
Buildpack added. Next release on signal-server-001 will use:
  1. https://github.com/heroku/heroku-buildpack-multi-procfile
  2. https://github.com/heroku/heroku-buildpack-nodejs
Run git push heroku master to create a new release using these buildpacks.

$ heroku config:set -a signal-server-001 PROCFILE=packages/cevitxe-signal-server/Procfile
Setting PROCFILE and restarting ⬢ signal-server-001... done, v3
PROCFILE: packages/cevitxe-signal-server/Procfile

$ git push https://git.heroku.com/signal-server-001.git master


```

```bash
$ git push heroku master
```

### Glitch

This server can run on [Glitch](https://glitch.com); just remix the
[**discovery-cloud**](https://glitch.com/edit/#!/remix/discovery-cloud) project.

## LICENSE

MIT

Based on https://github.com/orionz/discovery-cloud-server
