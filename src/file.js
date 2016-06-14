import fs from 'fs'
import path from 'path'
import glob from 'glob'
import crypto from 'crypto'
import chokidar from 'chokidar'
import archiver from 'archiver'
import {filter, map, concat, differenceWith} from 'ramda'
import {Promise, promisify} from 'bluebird'

const readFile = promisify(fs.readFile)
const mkdir = promisify(fs.mkdir)
const unlink = promisify(fs.unlink)
const bbGlob = promisify(glob)

export function parseIgnore (ignore) {
  const defaultIgnore = [
    '**/.*',
    '**/*~,',
    '**/*__',
    '.git/**/*',
    'package.json',
    'node_modules/**/*',
  ]
  const lines = ignore.match(/[^\r\n]+/g)
  const parsedIgnore = concat(defaultIgnore, filter(l => /^[^#\s]/.test(l), lines))
  return map(i => i.substr(-1) === '/' ? `${i}**` : i, parsedIgnore)
}

export function getVtexIgnore (root) {
  return readFile(path.resolve(root, '.vtexignore'), 'utf-8')
  .then(parseIgnore)
}

export function listFiles (root, ignore) {
  return bbGlob('**', {
    cwd: root,
    nodir: true,
    ignore: ignore,
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
    archive.append(fs.createReadStream(filePath), { name: f })
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

export function generateFileHash (root, file) {
  return readFile(path.resolve(root, file))
  .then(content => {
    return {
      path: file,
      hash: crypto.createHash('md5').update(content, 'binary').digest('hex'),
    }
  })
}

export function generateFilesHash (root, files) {
  return Promise.all(map(f => generateFileHash(root, f), files))
}

export function createBatch (localFiles, {data: sandboxFiles}) {
  let batch = {}
  differenceWith((sb, l) => sb.path === l.path, sandboxFiles, localFiles)
  .forEach(file => { batch[file.path] = 'remove' })
  localFiles.forEach(file => {
    let hasOnSandbox = false
    for (const sbFile of sandboxFiles) {
      const isFileEquals = file.path === sbFile.path
      const isHashEquals = file.hash === sbFile.hash
      if (isFileEquals) {
        if (!isHashEquals) {
          batch[file.path] = 'save'
        }
        hasOnSandbox = true
        break
      }
    }
    if (!hasOnSandbox) {
      batch[file.path] = 'save'
    }
  })
  return batch
}

export function createSaveChange (root, file) {
  return {
    content: fs.readFileSync(path.resolve(root, file)).toString('base64'),
    encoding: 'base64',
  }
}

export function createChanges (root, batch) {
  return Object.keys(batch).map(file =>
    batch[file] === 'save'
      ? { path: file, action: 'save', ...createSaveChange(root, file) }
      : { path: file, action: 'remove' }
  )
}

export function watch (root, ignore, sendChanges) {
  const watcher = chokidar.watch(root, {
    cwd: root,
    ignored: ignore,
    persistent: true,
    ignoreInitial: true,
    usePolling: process.platform === 'win32',
  })
  return new Promise((resolve, reject) => {
    watcher
    .on('add', f => sendSaveChanges(root, f, sendChanges))
    .on('change', f => sendSaveChanges(root, f, sendChanges))
    .on('unlink', f => sendRemoveChanges(root, f, sendChanges))
    .on('unlinkDir', f => sendRemoveChanges(root, f, sendChanges))
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
