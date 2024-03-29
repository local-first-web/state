## Seeing debug messages in the console

This project uses `debug` for logging; see https://github.com/visionmedia/debug
To show log messages in the browser console, you can add a `.env` file to the
`todo` root with a `REACT_APP_DEBUG` variable. For example:

- `REACT_APP_DEBUG=\*` will show all logs, including `sockjs`, `webrtc-swarm`, etc
- `REACT_APP_DEBUG=\*,-sockjs\*` will show all logs _except_ `sockjs`
- `REACT_APP_DEBUG=sockjs\*,lf\*` will show only `lf` and `sockjs` logs
- `REACT_APP_DEBUG=lf:todo\*` will show just logs from the todo example

If you don't want to use an `.env` file, you can just set the `debug` value in local storage
directly in the browser. By default, no logs are shown.
