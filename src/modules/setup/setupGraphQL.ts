import { IOContext, AppGraphQLClient } from '@vtex/api'
import generate from 'apollo/lib/generate'
import * as fs from 'fs'
import glob from 'glob'
import { getIntrospectionQuery, buildClientSchema, IntrospectionQuery, parse, Source } from 'graphql'
import { mergeSchemas } from 'graphql-tools'
import * as path from 'path'

import { BUILDERS_WITH_GRAPHQL_QUERIES, GENERATED_GRAPHQL_DIRNAME, GRAPHQL_GLOBAL_TYPES_FILE } from './consts'
import { apps } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import * as env from '../../env'
import userAgent from '../../user-agent'
import { dummyLogger } from '../../clients/dummyLogger'
import { getAppRoot } from '../../manifest'
import logger from '../../logger'

const context: IOContext = {
  account: getAccount(),
  authToken: getToken(),
  production: false,
  product: '',
  region: env.region(),
  route: {
    id: '',
    params: {},
  },
  userAgent,
  workspace: getWorkspace() || 'master',
  requestId: '',
  operationId: '',
  logger: dummyLogger,
  platform: '',
}

export async function setupGraphQL(manifest: Manifest, builders = BUILDERS_WITH_GRAPHQL_QUERIES) {
  const appBuilders = Object.keys(manifest.builders || {})

  const needGraphQLTypes = appBuilders.some(builderName => builders.includes(builderName))

  if (!needGraphQLTypes || !manifest.dependencies) {
    return
  }

  const root = getAppRoot()

  const graphQLFiles = await new Promise<string[]>((resolve, reject) =>
    glob(`+(${builders.join('|')})/**/*.{graphql,gql}`, { root }, (err, matches) => {
      if (err) {
        reject(err)
      } else {
        resolve(matches)
      }
    })
  )

  if (!graphQLFiles.length) {
    return
  }

  try {
    const graphqlDependencies = (
      await Promise.all(Object.keys(manifest.dependencies).map(dependentApp => apps.getApp(dependentApp)))
    ).filter(appManifest => 'graphql' in appManifest.builders)

    const dependenciesSchemas = await Promise.all(
      graphqlDependencies
        .map(app => `${app.vendor}.${app.name}@${app.version}`)
        .map(async appName => {
          const appGraphQLClient = new (class extends AppGraphQLClient {
            constructor() {
              super(appName, context, { timeout: 5000 })
            }

            public async introspect() {
              const response = await this.graphql.query<IntrospectionQuery, {}>({
                query: getIntrospectionQuery(),
                variables: {},
                throwOnError: true,
              })

              return response.data
            }
          })()

          const introspectionResult = await appGraphQLClient.introspect()

          const clientSchema = buildClientSchema(introspectionResult)

          return clientSchema
        })
    )

    const mergedSchemas = mergeSchemas({ schemas: dependenciesSchemas })

    const graphQLDocuments = await Promise.all(
      graphQLFiles.map(filePath => fs.promises.readFile(filePath).then(buffer => [filePath, buffer.toString()]))
    ).then(sourceDocuments =>
      sourceDocuments.map(([filePath, source]) => parse(new Source(source, path.join(root, filePath))))
    )

    // remove previously generated files
    // before generating new ones
    const previouslyGeneratedFiles = await new Promise<string[]>((resolve, reject) =>
      glob(`**/${GENERATED_GRAPHQL_DIRNAME}/*`, { root }, (err, matches) => {
        if (err) {
          reject(err)
        } else {
          resolve(matches)
        }
      })
    )

    await Promise.all(previouslyGeneratedFiles.map(filePath => fs.promises.unlink(filePath)))

    graphQLDocuments.forEach(document => {
      const [operationDefinition] = document.definitions

      const {
        loc: {
          source: { name: operationName },
        },
      } = operationDefinition

      const [builderName] = path.relative(root, operationName).split(path.sep)

      generate(
        // source document
        document,
        // project schema
        mergedSchemas,
        // output path
        GENERATED_GRAPHQL_DIRNAME,
        // "only" option (used for Swift language)
        undefined,
        // target language
        'typescript',
        // tagName, seems unused
        '',
        // whether to generate types next to sources
        true,
        {
          // this flag isn't important for us but it is required in the type
          // definition for the options.
          useFlowExactObjects: false,
          rootPath: root,
          globalTypesFile: path.join(builderName, GRAPHQL_GLOBAL_TYPES_FILE),
        }
      )
    })

    // this is an empty generated directory, remove
    // to reduce clutter
    await fs.promises.rmdir(path.join(root, GENERATED_GRAPHQL_DIRNAME))

    // we generate the number of GraphQL queries/mutations plus
    // a "global" types files for Input and Enums.
    const totalFiles = graphQLDocuments.length + 1

    logger.info(`Successfully generated ${totalFiles} GraphQL type file(s).`)
  } catch (err) {
    logger.error('Failed to generate GraphQL type files')
    logger.debug(err)
  }
}
