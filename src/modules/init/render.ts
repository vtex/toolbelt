import {join} from 'path'
import * as Bluebird from 'bluebird'
import {mkdir, readFile, writeFile} from 'fs-extra'

import log from '../../logger'
import {writeManifest} from './utils'
import {manifestPath} from '../../manifest'

const helloWorld = `import React, {Component} from 'react'

// eslint-disable-next-line
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

const makePlaceholdersFile = (vendor: string, name: string): string =>
  JSON.stringify({
    index: {
      path: '/',
      component: `${vendor}.${name}/index.js`,
    },
  }, null, 2)

const addRenderDeps = (manifest: Manifest): Manifest => {
  return {
    ...manifest,
    dependencies: {
      ...manifest.dependencies,
      'vtex.render-runtime': '0.x',
      'vtex.render-builder': '0.x',
    },
  }
}

const readManifest = (): Bluebird<Manifest> =>
  readFile(manifestPath, 'utf8').then(JSON.parse)

export default {
  description: 'Create a new render bootstrap project',
  handler: () => {
    log.debug('Reading manifest file')
    const renderRoot = join(process.cwd(), 'render')
    return readManifest()
      .tap(() =>
        log.debug('Adding render deps to manifest and creating render folder'),
      )
      .tap((manifest: Manifest) =>
        Promise.all([writeManifest(addRenderDeps(manifest)), mkdir(renderRoot)]),
      )
      .then(({vendor, name}: Manifest) =>
        Promise.all([
          writeFile(
            join(renderRoot, 'placeholders.json'),
            makePlaceholdersFile(vendor, name),
          ),
          writeFile(join(renderRoot, 'index.js'), helloWorld),
        ]),
      )
      .catch(err =>
        err && err.code === 'ENOENT'
          ? log.error('Manifest file not found.') : err,
      )
  },
}
