import debug_original, { Debugger } from 'debug'

// Extends the 'debug' module so that other console methods can be applied, using the same filters.

// Allow setting debug as an env variable, `REACT_APP_DEBUG`. Also allow temporarily overriding
// the env variable by manually setting the`debug_override` item in localStorage
localStorage.debug = localStorage.debug_override || process.env.REACT_APP_DEBUG

// These console properties will be added to the debug object.
enum ConsoleMethods {
  'assert',
  'clear',
  'count',
  'group',
  'groupCollapsed',
  'groupEnd',
  'table',
  'time',
  'timeEnd',
}

interface ConsoleSubset extends Pick<Console, keyof typeof ConsoleMethods> {}
interface DebuggerPlus extends Debugger, ConsoleSubset {}

const debug = (namespace: string): DebuggerPlus => {
  const enabled = debug_original.enabled(namespace)

  // apply selected methods from Console
  const debugPlus = debug_original(namespace) as any
  for (const k in ConsoleMethods)
    debugPlus[k] = (...args: any[]) => {
      const consoleMethod = (console as any)[k]
      if (enabled) return consoleMethod.bind(console)(...args)
    }

  return debugPlus
}

debug.enabled = debug_original.enabled

export default debug
