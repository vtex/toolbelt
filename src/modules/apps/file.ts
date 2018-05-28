import * as Bluebird from 'bluebird'
import * as chokidar from 'chokidar'
import { createReadStream, readFileSync, stat } from 'fs-extra'
import * as glob from 'globby'
import * as path from 'path'

import log from '../../logger'

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
]

const services = ['react', 'render', 'masterdata', 'service']

const safeFolder = folder => {
  if (folder && services.indexOf(folder) === -1) {
    log.warn('Using unknown service', folder)
  }
  return folder ? './' + folder + '/**' : '*/**'
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

export const listLocalFiles = (root: string, folder?: string): Bluebird<string[]> =>
  Promise.resolve(
    glob(`{manifest.json,policies.json,${safeFolder(folder)}}`, {
      cwd: root,
      dot: true,
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
