interface PackageJSON {
  name?: string
  private?: boolean
  contributors?: string | string[]
  license?: string
  repository?: string
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  [key: string]: string | string[] | boolean | Record<string, string>
}
