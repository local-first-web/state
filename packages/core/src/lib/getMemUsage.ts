export const getMemUsage = (context: any = window) => {
  if (!context.performance || !context.performance.memory) return {}
  const mem = context.performance.memory
  return {
    allocated: (mem.totalJSHeapSize / 1024 ** 2).toFixed(0),
    used: (mem.usedJSHeapSize / 1024 ** 2).toFixed(0),
  }
}
