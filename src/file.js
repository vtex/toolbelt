import fs from 'fs'
import path from 'path'
import glob from 'glob'
import log from './logger'
import rimraf from 'rimraf'
import chokidar from 'chokidar'
import archiver from 'archiver'
import {Promise, promisify} from 'bluebird'

const mkdir = promisify(fs.mkdir)
const bbRimraf = promisify(rimraf)
const unlink = promisify(fs.unlink)
const bbGlob = promisify(glob)

export function listLocalFiles (root) {
  return bbGlob('{.build/**/*,manifest.json}', {
    cwd: root,
    nodir: true,
  })
}

export function createTempPath (name, version) {
  const tempPath = path.resolve(module.filename, '../../temp/')
  const tempPathFile = path.resolve(tempPath, `${name}-${version}.zip`)
  return mkdir(tempPath)
  .then(() => tempPathFile)
  .catch(err => {
    return err.code === 'EEXIST'
      ? Promise.resolve(tempPathFile)
      : Promise.reject(err)
  })
}

export function compressFiles (files, destination) {
  const archive = archiver('zip')
  const output = fs.createWriteStream(destination)
  archive.pipe(output)
  files.forEach(f => {
    const filePath = path.resolve(process.cwd(), f)
    archive.append(fs.createReadStream(filePath), { name: rmBuildPrefix(f) })
  })
  archive.finalize()
  return new Promise((resolve, reject) => {
    output.on('close', () => {
      return resolve({
        file: fs.createReadStream(destination),
        size: archive.pointer(),
      })
    })
    archive.on('error', reject)
  })
}

export function deleteTempFile (tempPath) {
  return unlink(tempPath)
}

export function rmBuildPrefix (path) {
  return path.replace(/\.build[\/\\]/, '')
}

export function normalizePath (filePath) {
  return path.normalize(filePath).replace(/\\/g, '/')
}

export function createSaveChange (root, file) {
  return {
    content: fs.readFileSync(path.resolve(root, file)).toString('base64'),
    encoding: 'base64',
  }
}

export function createChanges (root, batch) {
  return Object.keys(batch).map(file => {
    const path = normalizePath(rmBuildPrefix(file))
    return batch[file] === 'save'
      ? { path: path, action: 'save', ...createSaveChange(root, file) }
      : { path: path, action: 'remove' }
  })
}

export function removeBuildFolder (root) {
  log.debug('Removing build folder...')
  return bbRimraf(path.resolve(root, '.build/'))
  .catch(err => {
    return err.code === 'ENOENT'
      ? Promise.resolve()
      : Promise.reject(err)
  })
}

export function watch (root, sendChanges) {
  const watcher = chokidar.watch(['.build/**/*', 'manifest.json'], {
    cwd: root,
    persistent: true,
    ignoreInitial: true,
    usePolling: process.platform === 'win32',
  })
  return new Promise((resolve, reject) => {
    watcher
    .on('add', f => sendSaveChanges(root, f, sendChanges))
    .on('change', f => sendSaveChanges(root, f, sendChanges))
    .on('unlink', f => sendRemoveChanges(root, f, sendChanges))
    .on('error', reject)
    .on('ready', resolve)
  })
}

export function sendSaveChanges (root, file, sendChanges) {
  return sendChanges(createChanges(root, { [file]: 'save' }))
}

export function sendRemoveChanges (root, file, sendChanges) {
  return sendChanges(createChanges(root, { [file]: 'remove' }))
}
