import {fork} from 'child-process-es6-promise'
import * as Bluebird from 'bluebird'
import * as chokidar from 'chokidar'
import { createReadStream, readFileSync, stat, lstat } from 'fs-extra'
import * as glob from 'globby'
import * as path from 'path'
import { map, filter, memoizeWith, identity, toPairs } from 'ramda'
import {join} from 'path'

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

export const getLinkFolder = memoizeWith(identity, async () => {
  const options = {
    env: { ...process.env },
    execArgv: [],
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  }
  const yarnPath = join(__dirname, '../../../node_modules/yarn/bin/yarn.js')
  const yarnProc = fork(yarnPath, ['config', 'current'], options)
  let linkFolder
  yarnProc.child.stdout.on('data', data => {
    try {
      const obj = JSON.parse(data)
      if (obj.linkFolder) linkFolder = obj.linkFolder
    }
    catch (e) { /* Ignore non JSON formats */ }
  })
  await yarnProc;
  return linkFolder
}) as () => Promise<string>

async function getNodeModules(root: string): Promise<string[]> {
  const packages = join('*', 'package.json')
  const namespacePackages = join('@*', '*', 'package.json')
  return await glob([packages, namespacePackages], { cwd: root }).then(map(path.dirname))
}

const mapAsync = (f) => (data) => Promise.map(data, f)

async function getLinkedDependencies(root: string): Promise<string[]> {
  const modulesDir = join(root, 'node_modules')
  const keepSymlinks = async (module: string) =>
    lstat(join(modulesDir, module.split('/').join(path.sep))).catch(() => null).then(stat => stat != null && stat.isSymbolicLink() ? module : null)
  const mods = await getNodeModules(modulesDir)
    .then(mapAsync(keepSymlinks))
    .then(paths => filter(path => path != null, paths))
  return mods
}

export async function createLinkedDepsConfig(root: string, linkFolder: string): Promise<any> {
  const appModules = {}, linkedPackages = {}

  const appsPromise = glob([join('*', 'package.json')], { cwd: root })
    .then(map(path.dirname))
    .then(mapAsync(async module => appModules[module] = await getLinkedDependencies(join(root, module.split('/').join(path.sep)))))

  const linkedPromise = getNodeModules(linkFolder)
    .then(mapAsync(async module => linkedPackages[module] = await getLinkedDependencies(join(linkFolder, module.split('/').join(path.sep)))))

  await Promise.all([appsPromise, linkedPromise])
  return { app: appModules, linkedPackages }
}

function optimizeLinkedDepsConfig(localConfig: any, usedDeps: Set<string>) {
  const { app: appModules, linkedPackages } = localConfig
  const linkedDepsConfig = { app: appModules, linkedPackages: {} }
  for (const [module, deps] of toPairs(linkedPackages)) if (usedDeps.has(module))
    linkedDepsConfig.linkedPackages[module] = deps
  return linkedDepsConfig
}

export function getUsedDependencies(linkedDepsConfig: any): string[] {
  const { app: appModules, linkedPackages } = linkedDepsConfig
  const used = new Set(), queue = []
  function checkDeps(deps: string[]) {
    for (const dep of deps) {
      if (used.has(dep)) continue
      queue.push(dep)
      used.add(dep)
    }
  }

  for (const [, deps] of toPairs(appModules)) checkDeps(deps)
  while (queue.length > 0) {
    const module = queue.pop()
    checkDeps(linkedPackages[module] || [])
  }
  return [...used]
}

export async function getLinkedDepsDirs(appSrc : string, linkFolder : string): Promise<string[]> {
  const localConfig = await createLinkedDepsConfig(appSrc, linkFolder)
  const usedDeps = getUsedDependencies(localConfig)
  return map(module => join(linkFolder, module.split('/').join(path.sep)), [...usedDeps])
}

export async function getLinkedFiles(localConfig: any, linkFolder: string, usedDeps : string[]): Promise<BatchStream[]> {
  const linkedDepsConfig = optimizeLinkedDepsConfig(localConfig, new Set(usedDeps))

  const linkedModulesFiles = await listLinkedFiles(linkFolder, [...usedDeps])
    .then(paths => map(pathToFileObject(linkFolder, '.linked_deps'), paths)) as BatchStream[]

  function jsonToStream(path: string, content: any): BatchStream {
    const stream = new Readable
    stream.push(JSON.stringify(content))
    stream.push(null) // EOF
    return { path, content: stream }
  }

  linkedModulesFiles.push(jsonToStream(join('.linked_deps', '.config'), linkedDepsConfig))
  return linkedModulesFiles
}

export const getIgnoredPaths = (root: string): string[] => {
  try {
    return readFileSync(path.join(root, '.vtexignore'))
      .toString()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.replace(/\/$/, '/**')).concat(defaultIgnored)
  } catch (e) {
    return defaultIgnored
  }
}

export const listLinkedFiles = async (linkFolder : string, usedDeps : string[]): Promise<string[]> => {
  const modules = map(dep => join(dep.split('/').join(path.sep), '**'), usedDeps)
  return await glob(modules, { cwd: linkFolder, ignore: getIgnoredPaths(linkFolder), nodir: true, })
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
          stat(path.join(root, file)).then(stats => ({ file, stats })),
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
        ? createReadStream(path.resolve(process.cwd(), filePath))
        : null,
      path: filePath.split(path.sep).join('/'),
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
