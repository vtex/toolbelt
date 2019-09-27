declare module '*/package.json' {
  const name: string
  const version: string
  const engines: {
    node: string
  }

  export { name, version, engines }
}
