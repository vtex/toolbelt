import { IOContext, AppGraphQLClient } from '@vtex/api'
import generate from 'apollo/lib/generate'
import * as fs from 'fs'
import glob from 'glob'
import {
  getIntrospectionQuery,
  buildClientSchema,
  IntrospectionQuery,
  parse,
  Source,
  validate,
  printError,
} from 'graphql'
import { mergeSchemas } from 'graphql-tools'
import * as path from 'path'

import { BUILDERS_WITH_GRAPHQL_QUERIES, GENERATED_GRAPHQL_DIRNAME, GRAPHQL_GLOBAL_TYPES_FILE } from './consts'
import { registry } from '../../clients'
import { getAccount, getToken, getWorkspace } from '../../conf'
import * as env from '../../env'
import userAgent from '../../user-agent'
import { dummyLogger } from '../../clients/dummyLogger'
import { getAppRoot } from '../../manifest'
import logger from '../../logger'
import chalk from 'chalk'

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

  const needGraphQLTypes =
    appBuilders.some(builderName => builders.includes(builderName)) || 'graphql' in manifest.builders

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
    const dependencies = Object.entries(manifest.dependencies)

    if ('graphql' in manifest.builders) {
      dependencies.push([`${manifest.vendor}.${manifest.name}`, manifest.version])
    }

    const graphqlDependencies = (
      await Promise.all(
        dependencies.map(([dependentApp, dependencyVersion]) =>
          registry.getAppManifest(dependentApp, dependencyVersion)
        )
      )
    ).filter(appManifest => 'graphql' in appManifest.builders)

    const dependenciesSchemas = (
      await Promise.all(
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

            try {
              const introspectionResult = await appGraphQLClient.introspect()

              const clientSchema = buildClientSchema(introspectionResult)

              return clientSchema
            } catch (err) {
              logger.error(
                chalk`Could not resolve GraphQL schema for app {bold ${appName}}. Is it linked or installed in this account and workspace?`
              )
              logger.debug(err.message, err.stack)
              return undefined
            }
          })
      )
    ).filter(Boolean)

    if (!dependenciesSchemas.length) {
      logger.warn('Could not resolve any app GraphQL schema. Aborting GraphQL types generation.')
      return
    }

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

    const totalFiles = graphQLDocuments.reduce((total, document) => {
      const [operationDefinition] = document.definitions

      const {
        loc: {
          source: { name: operationName },
        },
      } = operationDefinition

      const fileName = path.relative(root, operationName)

      const [builderName] = fileName.split(path.sep)

      const validationErrors = validate(mergedSchemas, document)

      if (validationErrors.length > 0) {
        logger.warn(
          chalk`Failed to generate GraphQL types for file {underline ${fileName}}:\n` +
            validationErrors.reduce((errors, error) => chalk`${errors}\n${printError(error)}\n`, '')
        )

        return total
      }

      try {
        const countFiles = generate(
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

        // we generate the number of GraphQL queries/mutations plus
        // a "global" types files for Input and Enums. so, we are subtracting
        // the global file count here, to add it later in the log.
        return total + countFiles - 1
      } catch (err) {
        return total
      }
    }, 0)

    // this is an empty generated directory, remove
    // to reduce clutter
    await fs.promises.rmdir(path.join(root, GENERATED_GRAPHQL_DIRNAME))

    logger.info(`Successfully generated ${totalFiles + 1} GraphQL type file(s).`)
  } catch (err) {
    logger.error('Failed to generate GraphQL type files')
    logger.debug(err)
  }
}
