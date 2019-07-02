import * as chokidar from 'chokidar'
import { createReadStream, lstat, readdir,readFile, realpath, Stats } from 'fs-extra'
import * as glob from 'glob'
import ignore from 'ignore'
import { dirname, join, resolve as resolvePath, sep } from 'path'
import { filter, map, partition, reduce, toPairs, unnest, values } from 'ramda'
import { Readable } from 'stream'
import { promisify } from 'util'
import log from '../../logger'
import { pathToFileObject } from './utils'

type AnyFunction = (...args: any[]) => any
const globP = promisify(glob)

const mapAsync = <I, O>(f : (datum : I) => Promise<O>) => (data : I[]) => Promise.map(data, f) as Promise<O[]>

function getDirs(root: string, predicate: (path: string, stat: Stats) => string): Promise<string[]> {
  const nullInvalidPaths = (path: string) => lstat(join(root, path))
    .catch(() => null)
    .then(stat => predicate(path, stat) ? path : null)
  return readdir(root)
    .then(mapAsync(nullInvalidPaths))
    .then(dirs => filter(dir => dir != null, dirs)) as Promise<string[]>
}

const getLinkedNodeModules = async (root: string): Promise<string[]> => {
  const isNamespaceOrLink = (path, stat) => stat != null && (path.startsWith('@') && stat.isDirectory() || stat.isSymbolicLink())
  const isLink = (_, stat) => stat != null && stat.isSymbolicLink()

  const [namespaces, modules] = await getDirs(root, isNamespaceOrLink)
    .catch(() => [])
    .then(partition(dir => dir.startsWith('@'))) as [string[], string[]]

  const getNamespaceLinks =
    namespace =>
      getDirs(join(root, namespace), isLink)
        .then(map(dir => [namespace, dir].join('/')))

  const namespaceModules = await Promise.map(namespaces, getNamespaceLinks).then(unnest) as string[]

  return [...modules, ...namespaceModules]
}

export async function createLinkConfig(appSrc: string) : Promise<LinkConfig> {
  const stack = []
  const graph: Record<string, string[]> = {}
  const metadata: Record<string, string> = {}

  const app = await globP(join('*', 'package.json'), { cwd: appSrc })
    .then(files => map(dirname, files))

  function checkLinks(deps: string[]) {
    for (const dep of deps) {
      if (dep in graph) {
        continue
      }
      stack.push(dep)
      graph[dep] = []
    }
  }

  function discoverDependencies(module : string) : Promise<string[]> {
    const path = module in metadata ? metadata[module] : join(appSrc, module)
    const depsRoot = join(path, 'node_modules')
    const moduleRealPath = async (moduleName: string): Promise<[string, string]> =>
      ([moduleName, await realpath(join(depsRoot, ...moduleName.split('/')))])

    return getLinkedNodeModules(depsRoot)
      .then(mapAsync(moduleRealPath))
      .then(map(addMetadata)) as Promise<string[]>
  }

  function addMetadata([moduleName, path]): string {
    if (moduleName in metadata && metadata[moduleName] !== path) {
      log.warn(`Found ${moduleName} from two sources as linked dependencies. Ignoring the one from ${path}`)
    } else {
      metadata[moduleName] = path
    }
    return moduleName
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
  const getFiles = async ([module, path]) => {
    console.log('CHAMEI')
    return await globP('**', { cwd: path, nodir: true, })
      .then(map(pathToFileObject(path, join('.linked_deps', module)))) as BatchStream[]
  }

  const linkedModulesFiles = unnest(await Promise.map(toPairs(linkConfig.metadata), getFiles))
  if (linkedModulesFiles.length > 0) {
    linkedModulesFiles.push(jsonToStream(join('.linked_deps', '.config'), linkConfig))
  }
  return linkedModulesFiles
}

function jsonToStream(path: string, linkConfig: LinkConfig): BatchStream {
  const stream = new Readable
  stream.push(JSON.stringify(linkConfig))
  stream.push(null) // EOF
  return { path, content: stream }
}

export function getLinkedDepsDirs(linkConfig : LinkConfig): string[] {
  return values(linkConfig.metadata)
}

export const getIgnoredPatterns = async (root: string) => {
  const ignoreFiles = ['.vtexignore', '.gitignore']
  const ignoredPatterns = await Promise.all(map(async file => {
    try {
      const content = await readFile(join(root, file))
      return content.toString().split('\n')
    } catch (e) {
      return []
    }
  }, ignoreFiles))
  const arrays = reduce((x, y) => [...x, ...y], [], ignoredPatterns)
  console.log(arrays)
  return ignore().add(arrays)
}

export const listLocalFiles = async (root: string): Promise<string[]> => {
  interface File {
    name: string,
    stats: Stats,
  }
  const ignoredPatterns = await getIgnoredPatterns(root)
  const fileNames: string[] = await globP('**/*', {
    cwd: root,
    follow: true,
    nodir: true,
  })
  const files = await Promise.all(
    fileNames.filter(ignoredPatterns.createFilter)
      .map(name => lstat(join(root, name)).then(stats => ({name, stats} as File))))
  return files.filter(file => file.stats.size > 0).map(file => file.name)
}
export const addChangeContent = (changes: Change[]): Batch[] =>
  changes.map(({ path: filePath, action }) => {
    return {
      content: action === 'save'
        ? createReadStream(resolvePath(process.cwd(), filePath))
        : null,
      path: filePath.split(sep).join('/'),
    }
  })

const sendSaveChanges = (file: string, sendChanges: AnyFunction): void =>
  sendChanges(addChangeContent([{ path: file, action: 'save' }]))

const sendRemoveChanges = (file: string, sendChanges: AnyFunction): void =>
  sendChanges(addChangeContent([{ path: file, action: 'remove' }]))

export const watch = async (root: string, sendChanges: AnyFunction) => {
  const watcher = chokidar.watch('**/*', {
    atomic: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
    },
    cwd: root,
    ignoreInitial: true,
    persistent: true,
    usePolling: true,
  })
  const ignoredPatterns = await getIgnoredPatterns(root)
  return new Promise((resolve, reject) => {
    watcher
      .on('add', (file, { size }) => size > 0 && !ignoredPatterns.ignores(join(root, file)) ? sendSaveChanges(file, sendChanges) : null)
      .on('change', (file, { size }) => {
        if (!ignoredPatterns.ignores(join(root, file))) {
          return size > 0
            ? sendSaveChanges(file, sendChanges)
            : sendRemoveChanges(file, sendChanges)
        }
      })
      .on('unlink', file => sendRemoveChanges(file, sendChanges))
      .on('error', reject)
      .on('ready', resolve)
  })
}
