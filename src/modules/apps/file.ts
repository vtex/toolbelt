import Bluebird from 'bluebird'
import chokidar from 'chokidar'
import { createReadStream, lstat, readFileSync } from 'fs-extra'
import glob from 'globby'
import { join, resolve as resolvePath, sep } from 'path'
import { reject } from 'ramda'
import log from '../../logger'

type AnyFunction = (...args: any[]) => any

const defaultIgnored = [
  '.DS_Store',
  'README.md',
  '.gitignore',
  'package.json',
  'node_modules/**',
  '**/node_modules/**',
  '.git/**',
]

const services = ['react', 'render', 'masterdata', 'service']

const safeFolder = folder => {
  if (folder && services.indexOf(folder) === -1) {
    log.warn('Using unknown service', folder)
  }
  return folder ? './' + folder + '/**' : '*/**'
}

const isTestOrMockPath = (p: string) => /.*(test|mock|snapshot).*/.test(p.toLowerCase())

export const getIgnoredPaths = (root: string, test: boolean = false): string[] => {
  try {
    const filesToIgnore = readFileSync(join(root, '.vtexignore'))
      .toString()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.replace(/\/$/, '/**'))
      .concat(defaultIgnored)
    return test ? reject(isTestOrMockPath, filesToIgnore) : filesToIgnore
  } catch (e) {
    return defaultIgnored
  }
}

export const listLocalFiles = (root: string, test: boolean = false, folder?: string): Promise<string[]> =>
  Promise.resolve(
    glob(['manifest.json', 'policies.json', 'node/.*', 'react/.*', `${safeFolder(folder)}`], {
      cwd: root,
      follow: true,
      ignore: getIgnoredPaths(root, test),
      nodir: true,
    })
  )
    .then((files: string[]) => Promise.all(files.map(file => lstat(join(root, file)).then(stats => ({ file, stats })))))
    .then(filesStats =>
      filesStats.reduce((acc, { file, stats }) => {
        if (stats.size > 0) {
          acc.push(file)
        }
        return acc
      }, [])
    )

export const addChangeContent = (changes: Change[]): Batch[] =>
  changes.map(({ path: filePath, action }) => {
    return {
      content: action === 'save' ? createReadStream(resolvePath(process.cwd(), filePath)) : null,
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
      .on('add', (file, { size }) => (size > 0 ? sendSaveChanges(file, sendChanges) : null))
      .on('change', (file, { size }) => {
        return size > 0 ? sendSaveChanges(file, sendChanges) : sendRemoveChanges(file, sendChanges)
      })
      .on('unlink', file => sendRemoveChanges(file, sendChanges))
      .on('error', reject)
      .on('ready', resolve)
  }) as Bluebird<string | void>
}
