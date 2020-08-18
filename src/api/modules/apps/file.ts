import { lstat, readFileSync, readJsonSync, writeJsonSync } from 'fs-extra'
import glob from 'globby'
import { join } from 'path'
import { reject } from 'ramda'
import log from '../../logger'
import { adaptPackageJsonForRender } from './vtexComponentsAdapter'

const defaultIgnored = [
  '.DS_Store',
  'README.md',
  '.gitignore',
  'package.json',
  'node_modules/**',
  '**/node_modules/**',
  '.git/**',
  'cypress/videos/**',
  'cypress/screenshots/**',
]

const services = ['react', 'render', 'masterdata', 'service']

const safeFolder = folder => {
  if (folder && services.indexOf(folder) === -1) {
    log.warn('Using unknown service', folder)
  }
  return folder ? `./${folder}/**` : '*/**'
}

const isTestOrMockPath = (p: string) => /.*(test|mock|snapshot).*/.test(p.toLowerCase())

const vtexComponentsAdapterEnabled = () => {
  try {
    const manifest = readJsonSync('./manifest.json')
    return manifest.vtexComponentsEnabled === true
  } catch(e) {
    return false
  }
}

const vtexComponentsAdapterEnabledFilter = (path: string) => {
  return vtexComponentsAdapterEnabled() ? path !== 'package.json' : true
}

export const getIgnoredPaths = (root: string, test = false): string[] => {
  try {
    const filesToIgnore = readFileSync(join(root, '.vtexignore'))
      .toString()
      .split('\n')
      .map(p => p.trim())
      .filter(p => p !== '')
      .map(p => p.replace(/\/$/, '/**'))
      .concat(defaultIgnored)
      .filter(vtexComponentsAdapterEnabledFilter)
    return test ? reject(isTestOrMockPath, filesToIgnore) : filesToIgnore
  } catch (e) {
    return defaultIgnored
  }
}

const loadVtexComponentsPackageJsonChanges = () => {
  try {
    const pkg = readJsonSync('./package.json')
    adaptPackageJsonForRender(pkg)
    writeJsonSync('./react/package.json', pkg)
  } catch(e) {
    console.log("Failed to link VTEX Components package.json")
  }
}

export const listLocalFiles = (root: string, test = false, folder?: string): Promise<string[]> => {
  if(vtexComponentsAdapterEnabled()) {
    loadVtexComponentsPackageJsonChanges()
  }

  return Promise.resolve(
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
}