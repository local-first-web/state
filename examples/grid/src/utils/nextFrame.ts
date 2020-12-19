export const nextFrame = () => new Promise<void>(ok => requestAnimationFrame(ok))
