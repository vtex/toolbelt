import {join} from 'path'
import log from '../../logger'
import {promisify} from 'bluebird'
import {writeManifest} from './utils'
import {manifestPath} from '../../manifest'
import {mkdir, readFile, writeFile} from 'fs'

const bbMkdir = promisify(mkdir)
const bbReadFile = promisify(readFile)
const bbWriteFile = promisify(writeFile)
const helloWorld = `import React, {Component} from 'react'

//eslint-disable-next-line
class HelloWorld extends Component {
  render () {
    return (
      <div>
        <h1>Hello world!</h1>
      </div>
    )
  }
}

export default HelloWorld
`

function makePlaceholdersFile (vendor, name) {
  return JSON.stringify({
    index: {
      path: '/',
      component: `${vendor}.${name}/index.js`,
    },
  }, null, 2)
}

function addRenderDeps (manifest) {
  return {
    ...manifest,
    dependencies: {
      ...manifest.dependencies,
      'vtex.render': '0.x',
    },
  }
}

function readManifest () {
  return bbReadFile(manifestPath).then(JSON.parse)
}

export default {
  description: 'Create a new render bootstrap project',
  handler: () => {
    log.debug('Reading manifest file')
    const renderRoot = join(process.cwd(), 'render')
    return readManifest()
    .tap(() =>
      log.debug('Adding render deps to manifest and creating render folder')
    )
    .tap(manifest =>
      Promise.all([
        writeManifest(addRenderDeps(manifest)),
        bbMkdir(renderRoot),
      ])
    )
    .then(({vendor, name}) =>
      Promise.all([
        bbWriteFile(
          join(renderRoot, 'placeholders.json'),
          makePlaceholdersFile(vendor, name)
        ),
        bbWriteFile(join(renderRoot, 'index.js'), helloWorld),
      ])
    )
    .catch(err =>
      err && err.code === 'ENOENT'
        ? log.error('Manifest file not found.')
        : Promise.reject(err)
    )
  },
}
