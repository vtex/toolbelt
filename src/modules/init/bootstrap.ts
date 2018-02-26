import {merge, map} from 'ramda'
import {join} from 'path'
import * as Bluebird from 'bluebird'
import {mkdir, readFile, writeFile} from 'fs-extra'
import * as inquirer from 'inquirer'

import log from '../../logger'
import {writeManifest} from './utils'
import {manifestPath} from '../../manifest'

const addBuilder = (manifest: Manifest, builder: string): Manifest => {
  return {
    ...manifest,
    builders: merge(manifest.builders || {}, buildersForApp[builder]),
  }
}

const buildersForApp = {
  graphql: {
    graphql: '1.x',
    node: '3.x',
  },
  react: {
    pages: '0.x',
    react: '1.x',
  },
  service: {
    service: '1.x',
  },
}

const structures: {[name: string]: Structure} = {
  graphql: [
    {
      type: 'folder',
      name: 'graphql',
      content: [
        {
          type: 'file',
          name: 'schema.graphql',
          content: `
# Default GraphQL Type. You can learn more about GraphQL here: http://graphql.org/learn/
type MyProductType {
  name: String!
}

# VTEX IO autogenerates the CRUD queries for this type
type HelloAutopersisted @autopersist {
  id: ID! # NOTE: Autopersisted types must have an ID
  author: String @searchable # NOTE: You can also search by the author
  name: String # NOTE: You can NOT search by the name because it has no @searchable directive
}

# Specifies the available queries
type Query {
  getMeAProductName: MyProductType!
}

type Mutation {
  changeProductName(targetName: String!): MyProductType
}
          `,
        },
      ],
    },
    {
      type: 'folder',
      name: 'node',
      content: [
        {
          type: 'folder',
          name: 'graphql',
          content: [
            {
              type: 'file',
              name: 'index.ts',
              content: `
/**
 *  Simple in-memory database
 */
const product = {
  name: 'My awesome product'
}

/**
 *  You shoud write your GraphQL resolvers in here.
 * Resolvers are nothing else than usual node functions, so here you can make
 * API calls, connect to the database and transform the data in any way you wish
 */
export const resolvers = {
  Query: {
    getMeAProductName: () => {
      return product
    }
  },
  Mutation: {
    changeProductName: (base, variables, ctx) => {
      const {targetName} = variables
      product.name = targetName
      return product
    }
  }
}             `,
            },
          ],
        },
      ],
    },
  ],
  react: [
    {
      type: 'folder',
      name: 'react',
      content: [
        {
          type: 'file',
          name: 'index.js',
          content: `import React from 'react'

export default function HelloWorld () {
  return (
    <div>
      <h1>Hello world!</h1>
    </div>
  )
}
`,
        },
      ],
    },
    {
      type: 'folder',
      name: 'pages',
      content: [
        {
          type: 'file',
          name: 'pages.json',
          content: JSON.stringify({
            pages: {
              index: {
                path: '/index',
              },
            },
            extensions: {
              index: {
                component: 'index',
              },
            },
          }, null, 2),
        },
      ],
    },
  ],
  service: [
    {
      type: 'folder',
      name: 'service',
      content: [
        {
          type: 'file',
          name: 'index.js',
          content: `export default {
  routes: {
    async helloWorld (ctx): Promise<void> {
      ctx.res.status = 200
      ctx.res.body = 'Hello world!'
    }
  }
}
`,
        },
        {
          type: 'file',
          name: 'service.json',
          content: JSON.stringify({
            stack: 'nodejs',
            memory: 128,
            ttl: 5,
            routes: {
              helloWorld: {
                path: '/',
              },
            },
          }
          , null, 2),
        },
      ],
    },
  ],
}

const generate = async (path: string, structure: Structure) => {
  return Promise.all(map(
    fileOrFolder => fileOrFolder.type === 'file' ?
      generateFile(path, fileOrFolder) :
      generateFolder(path, fileOrFolder),
    structure))
}

const generateFile = async (path: string, file: File) => {
  return writeFile(join(path, file.name), file.content || '')
}

const generateFolder = async (path: string, folder: Folder) => {
  const folderPath = join(path, folder.name)
  await mkdir(folderPath)
  await generate(folderPath, folder.content || [])
}

const readManifest = (): Bluebird<Manifest> =>
  readFile(manifestPath, 'utf8').then(JSON.parse)

export default async (builder: string) => {
  try {
    log.debug('Reading manifest file')
    const manifest = await readManifest()

    if (manifest.builders && manifest.builders[builder]) {
      log.warn(`It seems ${builder} has already been added to this app.`)
      const proceed = await inquirer.prompt({
        type: 'confirm',
        name: 'proceed',
        message: 'Do you wish to proceed?',
        default: false,
      })
      if (!proceed) {
        return
      }
    }

    log.debug(`Adding ${builder} builder to manifest`)
    await writeManifest(addBuilder(manifest, builder))

    log.debug(`Creating ${builder} folder structure`)

    await generate(process.cwd(), structures[builder])
  } catch (err) {
    err && err.code === 'ENOENT' ? log.error('Manifest file not found.') : err
  }
}
