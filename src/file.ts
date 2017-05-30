import * as path from 'path'
import * as glob from 'globby'
import * as Bluebird from 'bluebird'
import * as chokidar from 'chokidar'
import {readFileSync, stat} from 'fs-extra'

import log from './logger'

const defaultIgnored = [
  '.DS_Store',
  'README.md',
  '.eslintrc',
  '.gitignore',
  'CHANGELOG.md',
  'package.json',
  'node_modules/**',
]

const services = ['render', 'masterdata', 'service']

const safeFolder = folder => {
  if (services.indexOf(folder) === -1) {
    log.warn('Using unknown service', folder)
  }
  return folder ? './' + folder + '/**' : '*/**'
}

const getIgnoredPaths = (root: string): string[] => {
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

export const dirnameJoin = (filePath: string): string =>
  path.resolve(__dirname, filePath)

export const listLocalFiles = (root: string, folder?: string): Bluebird<string[]> =>
  Promise.resolve(
    glob(`{manifest.json,${safeFolder(folder)}}`, {
      cwd: root,
      nodir: true,
      follow: true,
      ignore: getIgnoredPaths(root),
    }),
  )
  .then((files: string[]) =>
    Promise.all(
      files.map(file =>
        stat(path.join(root, file)).then(stats => ({file, stats})),
      ),
    ),
  )
  .then(filesStats =>
    filesStats.reduce((acc, {file, stats}) => {
      if (stats.size > 0) {
        acc.push(file)
      }
      return acc
    }, []),
  )

export const addChangeContent = (changes: Change[]): Batch[] =>
  changes.map(({path: filePath, action}) => {
    return {
      path: filePath.split(path.sep).join('/'),
      content: action === 'save'
        ? readFileSync(path.resolve(process.cwd(), filePath)).toString('base64')
        : null,
    }
  })

export const sendSaveChanges = (file: string, sendChanges: Function): void =>
  sendChanges(addChangeContent([{path: file, action: 'save'}]))

export const sendRemoveChanges = (file: string, sendChanges: Function): void =>
  sendChanges(addChangeContent([{path: file, action: 'remove'}]))

export const watch = (root: string, sendChanges: Function, folder?: string): Bluebird<string> => {
  const watcher = chokidar.watch([`${safeFolder(folder)}`, '*.json'], {
    cwd: root,
    persistent: true,
    ignoreInitial: true,
    ignored: getIgnoredPaths(root),
    usePolling: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
    },
    atomic: true,
  })
  return new Promise((resolve, reject) => {
    watcher
    .on('add', (file, {size}) => size > 0 ? sendSaveChanges(file, sendChanges) : null)
    .on('change', (file, {size}) => {
      return size > 0
        ? sendSaveChanges(file, sendChanges)
        : sendRemoveChanges(file, sendChanges)
    })
    .on('unlink', file => sendRemoveChanges(file, sendChanges))
    .on('error', reject)
    .on('ready', resolve)
  })
}
