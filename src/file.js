import fs from 'fs'
import path from 'path'
import glob from 'glob'
import chokidar from 'chokidar'
import {Promise, promisify} from 'bluebird'

const bbGlob = promisify(glob)
const bbStat = promisify(fs.stat)

export function dirnameJoin (filePath) {
  return path.resolve(__dirname, filePath)
}

export function listLocalFiles (root) {
  return bbGlob('{manifest.json,*/**}', {
    cwd: root,
    nodir: true,
    follow: true,
    ignore: getIgnoredPaths(root),
  })
  .then(files =>
    Promise.all(
      files.map(file =>
        bbStat(path.join(root, file)).then(stats => ({file, stats}))
      )
    )
  )
  .then(filesStats =>
    filesStats.reduce((acc, {file, stats}) => {
      if (stats.size > 0) {
        acc.push(file)
      }
      return acc
    }, [])
  )
}

export function normalizePath (filePath) {
  return path.normalize(filePath).replace(/\\/g, '/')
}

export const addChangeContent = (changes) => {
  return changes.map(({path: filePath, action}) => {
    return {
      path: filePath.replace('\\', '/'),
      content: action === 'save'
        ? fs.readFileSync(path.resolve(process.cwd(), filePath)).toString('base64')
        : null,
    }
  })
}

const defaultIgnored = [
  'node_modules/**',
  'README.md',
  'CHANGELOG.md',
  '.eslintrc',
  '.gitignore',
  'package.json',
  '.DS_Store',
]

function getIgnoredPaths (root) {
  try {
    return fs.readFileSync(path.join(root, '.vtexignore'))
      .toString()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.replace(/\/$/, '/**')).concat(defaultIgnored)
  } catch (e) {
    return defaultIgnored
  }
}

export function watch (root, sendChanges) {
  const watcher = chokidar.watch(['*/**', '*.json'], {
    cwd: root,
    persistent: true,
    ignoreInitial: true,
    ignored: getIgnoredPaths(root),
    usePolling: process.platform === 'win32',
    awaitWriteFinish: {
      stabilityThreshold: 50,
      pollInterval: 10,
    },
  })
  return new Promise((resolve, reject) => {
    watcher
    .on('add', (file, {size}) => size > 0 ? sendSaveChanges(root, file, sendChanges) : null)
    .on('change', (file, {size}) => {
      return size > 0
        ? sendSaveChanges(root, file, sendChanges)
        : sendRemoveChanges(root, file, sendChanges)
    })
    .on('unlink', file => sendRemoveChanges(root, file, sendChanges))
    .on('error', reject)
    .on('ready', resolve)
  })
}

export function sendSaveChanges (root, file, sendChanges) {
  return sendChanges(addChangeContent([{ path: file, action: 'save' }]))
}

export function sendRemoveChanges (root, file, sendChanges) {
  return sendChanges(addChangeContent([{ path: file, action: 'remove' }]))
}
