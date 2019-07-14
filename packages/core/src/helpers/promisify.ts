export function promisify(emitter: Emitter, event: string): Promise<void>; // overload for emmiter event

export function promisify(cb: (...args: any[]) => void): Promise<void>; // overload for node callback

// implementation
export function promisify(obj: Emitter | Function, event?: string): Promise<void> | void {
  if (typeof obj !== 'function' && obj.on && event) {
    return new Promise(ok => obj.on(event!, ok));
  }
  else if (typeof obj === 'function') {
    const fn = obj;
    return new Promise(ok => fn(ok));
  }
}
interface Emitter {
  on: (event: any, cb: () => void) => void;
}
