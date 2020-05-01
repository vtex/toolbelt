export const createLog = (scriptName: string) => (ev: Record<string, any>) => {
  console.log({ script: scriptName, ...ev })
}
