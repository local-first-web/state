## Seeing debug messages in the console

This project uses `debug` for logging; see https://github.com/visionmedia/debug
To show log messages in the browser console, you can add a `.env` file to the
`todo` root with a `REACT_APP_DEBUG` variable. For example:

- `REACT_APP_DEBUG=\*` will show all logs, including sockjs, webrtc-swarm, etc
- `REACT_APP_DEBUG=\*,-sockjs\*` will show all logs _except_ sockjs
- `REACT_APP_DEBUG=sockjs\*,cevitxe\*` will show only cevitxe and sockjs logs
- `REACT_APP_DEBUG=cevitxe:todo\*` will show just logs from the todo example

To temporarily override the environment setting, you can set a `debug_override`
value in localStorage.

If you don't want to use an `.env` file, you can just set the `debug` value in localStorage
directly in the browser. By default, no logs are shown.
