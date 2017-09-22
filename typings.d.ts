interface Change {
  path: string,
  action: 'save' | 'remove',
}

interface Batch {
  path: string,
  content: string | null,
}

interface BatchStream {
  path: string,
  contents: NodeJS.ReadableStream,
}

interface Manifest {
  name?: string,
  title?: string,
  vendor?: string,
  version?: string,
  dependencies?: {},
  builders?: {},
  settingsSchema?: {},
  description?: string,
  categories?: string[],
  registries?: string[],
  mustUpdateAt?: string,
  latest?: string,
}

interface InstalledApp {
  app: string,
}

interface InfraResourceVersions {
  versions: {
    [region: string]: string[],
  },
}

interface InfraAvailableResources {
  [name: string]: InfraResourceVersions,
}

interface InfraInstalledResources {
  name: string,
  version: string,
}

interface IoVersions {
  version: string,
  tested: boolean,
  services: {
    [name: string]: string,
  }
}

interface InfraUpdate {
  [name: string]: {
    latest: string,
    current: string,
  },
}

interface InfraVersionMap {
  latest: {
    [name: string]: string,
  },
  update: InfraUpdate,
}

interface File {
  type: 'file',
  name: string,
  content: string
}

interface Folder {
  type: 'folder',
  name: string,
  content: Structure
}

type Structure = (File | Folder)[]

interface Message {
  level: string,
  sender: string,
  subject: string,
  body: {
    code: string,
    message: string,
  },
}

interface MessageJSON {
  data: string,
}

interface WorkspaceResponse {
  name: string,
  weight: number,
  production: boolean,
}

interface VersionByApp {
  location: string,
  versionIdentifier: string,
}

interface VersionsByAppResponse {
  data: VersionByApp[],
}

type Context = {
  account: string,
  workspace: string,
}

declare module '*/package.json' {
  const name: string
  const version: string
  export {name, version}
}
