import * as Bluebird from 'bluebird'
import * as chokidar from 'chokidar'
import { createReadStream, readFileSync, stat, lstat, readdir, realpath } from 'fs-extra'
import * as glob from 'globby'
import { map, filter, partition, unnest } from 'ramda'
import { join, sep, resolve, dirname } from 'path'

import log from '../../logger'
import { pathToFileObject } from './utils'
import { Readable } from 'stream'

type AnyFunction = (...args: any[]) => any

const defaultIgnored = [
  '.DS_Store',
  'README.md',
  '.eslintrc',
  '.gitignore',
  'CHANGELOG.md',
  'package.json',
  'node_modules/**',
  '**/node_modules/**',
  '.*/**/node_modules/**',
]

const services = ['react', 'render', 'masterdata', 'service']

const safeFolder = folder => {
  if (folder && services.indexOf(folder) === -1) {
    log.warn('Using unknown service', folder)
  }
  return folder ? './' + folder + '/**' : '*/**'
}

const mapAsync = (f) => (data) => Promise.map(data, f)

async function getDirs(root: string, predicate: (string, Stats) => string): Promise<string[]> {
  const nullInvalidPaths = async (path: string) => await lstat(join(root, path))
    .catch(() => null)
    .then(stat => predicate(path, stat) ? path : null)
  return await readdir(root)
    .then(mapAsync(nullInvalidPaths))
    .then(dirs => filter(dir => dir != null, dirs))
}

async function getNodeModules(root: string, onlyLinks : boolean = true): Promise<string[]> {
  const isNamespaceOrLink = (path, stat) => stat != null && (path.startsWith('@') && stat.isDirectory() || stat.isSymbolicLink())
  const isDirOrLink = (_, stat) => stat != null && (stat.isDirectory() || stat.isSymbolicLink())
  const isLink = (_, stat) => stat != null && stat.isSymbolicLink()

  const [namespaces, modules] = await getDirs(root, onlyLinks ? isNamespaceOrLink : isDirOrLink)
    .then(partition(dir => dir.startsWith('@')))
    .catch(() => [[], []])

  const namesepaceModules = await Promise.map(
    namespaces,
    async namespace =>
      await getDirs(join(root, namespace), onlyLinks ? isLink : isDirOrLink)
        .then(map(dir => [namespace, dir].join('/'))))
    .then(unnest) as string[]

  return [...modules, ...namesepaceModules]
}

export async function createLinkConfig(appSrc: string) : Promise<LinkConfig> {
  const stack = []
  const graph: Record<string, string[]> = {}
  const metadata: Record<string, string> = {}

  const app = await glob([join('*', 'package.json')], { cwd: appSrc })
    .then(map(dirname))

  function checkLinks(deps: string[]) {
    for (const dep of deps) {
      if (dep in graph) continue
      stack.push(dep)
      graph[dep] = []
    }
  }

  async function discoverDependencies(module : string) : Promise<string[]> {
    const path = metadata[module] ? metadata[module] : join(appSrc, module)
    const depsRoot = join(path, 'node_modules')
    const moduleRealPath = async (module: string) =>
      ({ module, path: await realpath(join(depsRoot, ...module.split('/'))) })

    const addMetadata = ({ module, path }) => {
      if (module in metadata && metadata[module] != path) {
        log.warn(`Found ${module} from two sources as linked dependencies. Ignoring the one from ${path}`)
      }
      metadata[module] = path
      return module
    }

    return await getNodeModules(depsRoot)
      .then(mapAsync(moduleRealPath))
      .then(map(addMetadata)) as string[]
  }

  stack.push(...app)
  while (stack.length > 0) {
    const module = stack.pop()
    const dependencies = await discoverDependencies(module)
    graph[module] = dependencies
    checkLinks(dependencies)
  }

  return { metadata, graph }
}

export async function getLinkedFiles(linkConfig: LinkConfig): Promise<BatchStream[]> {
  const ignore = [
    '.DS_Store',
    'README.md',
    '.eslintrc',
    '.gitignore',
    'CHANGELOG.md',
    'node_modules/**',
    '**/node_modules/**',
  ]
  const getFiles = async ([module, path]) => {
    return await glob(['**'], { cwd: path, ignore, nodir: true, })
      .then(map(pathToFileObject(path, join('.linked_deps', module)))) as BatchStream[]
  }

  const linkedModulesFiles = unnest(await Promise.map(Object.entries(linkConfig.metadata), getFiles))

  function jsonToStream(path: string, linkConfig : LinkConfig): BatchStream {
    const stream = new Readable
    stream.push(JSON.stringify(linkConfig))
    stream.push(null) // EOF
    return { path, content: stream }
  }

  linkedModulesFiles.push(jsonToStream(join('.linked_deps', '.config'), linkConfig))
  return linkedModulesFiles
}

export function getLinkedDepsDirs(linkConfig : LinkConfig): string[] {
  return Object.values(linkConfig.metadata)
}

export const getIgnoredPaths = (root: string): string[] => {
  try {
    return readFileSync(join(root, '.vtexignore'))
      .toString()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.replace(/\/$/, '/**')).concat(defaultIgnored)
  } catch (e) {
    return defaultIgnored
  }
}

export const listLocalFiles = (root: string, folder?: string): Promise<string[]> =>
  Promise.resolve(
    glob(['manifest.json', 'policies.json', `${safeFolder(folder)}`], {
      cwd: root,
      follow: true,
      ignore: getIgnoredPaths(root),
      nodir: true,
    }),
  )
    .then((files: string[]) =>
      Promise.all(
        files.map(file =>
          stat(join(root, file)).then(stats => ({ file, stats })),
        ),
      ),
  )
    .then(filesStats =>
      filesStats.reduce((acc, { file, stats }) => {
        if (stats.size > 0) {
          acc.push(file)
        }
        return acc
      }, []),
  )

export const addChangeContent = (changes: Change[]): Batch[] =>
  changes.map(({ path: filePath, action }) => {
    return {
      content: action === 'save'
        ? createReadStream(resolve(process.cwd(), filePath))
        : null,
      path: filePath.split(sep).join('/'),
    }
  })

const sendSaveChanges = (file: string, sendChanges: AnyFunction): void =>
  sendChanges(addChangeContent([{ path: file, action: 'save' }]))

const sendRemoveChanges = (file: string, sendChanges: AnyFunction): void =>
  sendChanges(addChangeContent([{ path: file, action: 'remove' }]))

export const watch = (root: string, sendChanges: AnyFunction, folder?: string): Bluebird<string | void> => {
  const watcher = chokidar.watch([`${safeFolder(folder)}`, '*.json'], {
    atomic: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
    },
    cwd: root,
    ignoreInitial: true,
    ignored: getIgnoredPaths(root),
    persistent: true,
    usePolling: true,
  })
  return new Promise((resolve, reject) => {
    watcher
      .on('add', (file, { size }) => size > 0 ? sendSaveChanges(file, sendChanges) : null)
      .on('change', (file, { size }) => {
        return size > 0
          ? sendSaveChanges(file, sendChanges)
          : sendRemoveChanges(file, sendChanges)
      })
      .on('unlink', file => sendRemoveChanges(file, sendChanges))
      .on('error', reject)
      .on('ready', resolve)
  })
}
