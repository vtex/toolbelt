import { AppGraphQLClient, IOContext } from '@vtex/api'
import generate from 'apollo/lib/generate'
import { AxiosError } from 'axios'
import * as fs from 'fs'
import glob from 'globby'
import {
  buildClientSchema,
  DefinitionNode,
  DocumentNode,
  getIntrospectionQuery,
  IntrospectionQuery,
  Kind,
  parse,
  printError,
  Source,
  validate,
} from 'graphql'
import { mergeSchemas } from 'graphql-tools'
import * as path from 'path'

import { BUILDERS_WITH_GRAPHQL_QUERIES, GENERATED_GRAPHQL_DIRNAME, GRAPHQL_GLOBAL_TYPES_FILE } from './consts'
import * as env from '../../api/env'
import userAgent from '../../user-agent'
import { dummyLogger } from '../../api/dummyLogger'
import { getAppRoot } from '../../api/manifest'
import logger from '../../api/logger'
import chalk from 'chalk'
import { SessionManager } from '../../api/session'
import { createRegistryClient } from '../../api/clients/IOClients/infra'

const { account, workspace, token } = SessionManager.getSingleton()
const context: IOContext = {
  account,
  authToken: token,
  production: false,
  product: '',
  region: env.region(),
  route: {
    id: '',
    params: {},
  },
  userAgent,
  workspace: workspace || 'master',
  requestId: '',
  operationId: '',
  logger: dummyLogger,
  platform: '',
}

class CustomAppGraphQLClient extends AppGraphQLClient {
  constructor(appName: string) {


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
}

/**
 * Resolve the imports of a GraphQL document and return them as
 * an array of definition node.
 */
function resolveImports(source: string, filePath: string): DefinitionNode[] {
  const newlinePattern = /(\r\n|\r|\n)+/
  const importPattern = /^# ?import/

  const getFilepaths = (src: string, relFile: string) => {
    const imports = src.split(newlinePattern).filter(line => importPattern.test(line))
    return imports.map(statement => {
      const importPath = statement
        .split(/[\s\n]+/g)
        .slice(-1)[0]
        .slice(1, -1)
      return path.resolve(path.dirname(relFile), importPath)
    })
  }

  const getDefinitions = (filepath: string, acc: DefinitionNode[] = []): DefinitionNode[] => {
    const sanitizedFilePath = filepath.replace(/'/g, '')
    const importSrc = fs.readFileSync(sanitizedFilePath).toString()

    const importDocument = parse(new Source(importSrc, sanitizedFilePath))
    const nestedPaths = getFilepaths(importSrc, filepath)

    const definitions =
      nestedPaths.length > 0
        ? [
            ...nestedPaths.reduce((srcArr, fp) => [...srcArr, ...getDefinitions(fp, [])], []),
            ...importDocument.definitions,
          ]
        : importDocument.definitions

    return [...definitions, ...acc]
  }

  const imports = getFilepaths(source, filePath)

  if (imports.length === 0) {
    return []
  }

  return imports.reduce<DefinitionNode[]>((acc, fp: string) => [...acc, ...getDefinitions(fp, [])], [])
}

export async function setupGraphQL(manifest: Manifest, builders = BUILDERS_WITH_GRAPHQL_QUERIES) {
  const appBuilders = Object.keys(manifest.builders || {})

  // we should generate these types if the app includes
  // builders which can query GraphQL server.
  const needGraphQLTypes = appBuilders.some(builderName => builders.includes(builderName))

  if (!needGraphQLTypes || !manifest.dependencies) {
    return
  }

  const root = getAppRoot()

  // retrieves all GraphQL documents in the builder folder. ideally we should
  // only use the files that the app requires (i.e. only the queries import'ed
  // by the React components), but we can get by with this for now.
  const graphQLFiles = await glob(`+(${builders.join('|')})/**/*.{graphql,gql}`, { cwd: root })

  if (!graphQLFiles.length) {
    return
  }

  try {
    const dependencies = Object.entries(manifest.dependencies)

    // if the app has a graphql builder, we should include it
    // in the dependencies for the schema introspection, since the
    // builders that can query server could query it's own server.
    if ('graphql' in manifest.builders) {
      dependencies.push([`${manifest.vendor}.${manifest.name}`, manifest.version])
    }

    const graphqlDependencies = (
      await Promise.all(
        dependencies.map(([dependentApp, dependencyVersion]) => {
          const registry = createRegistryClient(context)
          return registry.getAppManifest(dependentApp, dependencyVersion)
        })
      )
    ).filter(appManifest => 'graphql' in appManifest.builders)

    const dependenciesSchemas = (
      await Promise.all(
        graphqlDependencies
          .map(app => `${app.vendor}.${app.name}@${app.version}`)
          .map(async appName => {
            // the only way to consume the GraphQL from an app is to extend
            // the `AppGraphQLClient` class, because the `this.graphql` field
            // is protected and can't be accessed outside it.
            const appGraphQLClient = new CustomAppGraphQLClient(appName)

            try {
              const introspectionResult = await appGraphQLClient.introspect()

              return buildClientSchema(introspectionResult)
            } catch (err) {
              let detailError = ''

              if ('config' in err) {
                const axiosError = err as AxiosError

                if (axiosError.response) {
                  if (axiosError.response.status === 400) {
                    detailError = 'It may not support the instrospection query.'
                  }
                } else {
                  detailError = 'Timeout limit exceeded.'
                }
              } else {
                detailError = 'Is it linked of installed in this account and workspace?'
              }

              logger.error(chalk`Could not resolve GraphQL schema for app {bold ${appName}}. ${detailError}`)
              logger.debug(err.message, err.stack)
              return undefined
            }
          })
      )
    ).filter(Boolean)

    if (!dependenciesSchemas.length) {
      logger.warn('Could not resolve any GraphQL app schema. Aborting GraphQL types generation.')
      return
    }

    const mergedSchemas = mergeSchemas({ schemas: dependenciesSchemas })

    // parse all files into a GraphQL document
    const graphQLDocuments = (
      await Promise.all(
        graphQLFiles.map(filePath => fs.promises.readFile(filePath).then(buffer => [filePath, buffer.toString()]))
      )
    )
      .map(([filePath, source]) => [filePath, source, resolveImports(source, filePath)] as const)
      .map(([filePath, source, imports]) => [imports, parse(new Source(source, path.join(root, filePath)))] as const)

    // remove previously generated files before generating new ones
    const previouslyGeneratedFiles = await glob(`**/${GENERATED_GRAPHQL_DIRNAME}/*`, { cwd: root })

    await Promise.all(previouslyGeneratedFiles.map(filePath => fs.promises.unlink(filePath)))

    // removes invalid documents and print errors
    const validDocuments = graphQLDocuments.filter(([imports, document]) => {
      const [operationDefinition] = document.definitions

      const {
        loc: {
          source: { name: operationName },
        },
      } = operationDefinition

      const fileName = path.relative(root, operationName)

      const validationErrors = validate(mergedSchemas, {
        kind: Kind.DOCUMENT,
        definitions: [...imports, ...document.definitions],
      })

      if (validationErrors.length > 0) {
        logger.warn(
          chalk`Failed to generate GraphQL types for file {underline ${fileName}}:\n` +
            validationErrors.reduce((errors, error) => chalk`${errors}\n${printError(error)}\n`, '')
        )
      }

      return validationErrors.length === 0
    })

    // group GraphQL documents by builder before generating the types.
    const documentsByBuilder = validDocuments
      .map(([imports, document]) => {
        return document.definitions.reduce<{ [builder: string]: DefinitionNode[] }>((acc, operationDefinition) => {
          const {
            loc: {
              source: { name: operationName },
            },
          } = operationDefinition

          const fileName = path.relative(root, operationName)

          const [builderName] = fileName.split(path.sep)

          const builderDefinitions = acc[builderName] ?? []

          return { ...acc, [builderName]: [...builderDefinitions, ...imports, operationDefinition] }
        }, {})
      })
      .reduce<Array<[string, DefinitionNode[]]>>(
        (acc, operationsByBuilder) => [...acc, ...Object.entries(operationsByBuilder)],
        []
      )
      .reduce<{ [builder: string]: DocumentNode }>((acc, [builderName, operations]) => {
        const builderDefinitions = acc[builderName]?.definitions ?? []

        // remove possible duplicate definitions. this is necessary because
        // the way we allow imports of shared graphql files, so, if two documents
        // imports the same file (e.g. a shared Fragment definition), the fragment
        // will be included twice (one time for each module that imports it), so
        // we need to remove these duplicates.
        const operationsToInclude = operations.filter(
          operation => !builderDefinitions.find(definition => definition.loc.source.name === operation.loc.source.name)
        )

        return {
          ...acc,
          [builderName]: {
            kind: Kind.DOCUMENT,
            definitions: [...builderDefinitions, ...operationsToInclude],
          },
        }
      }, {})

    const totalFiles = Object.entries(documentsByBuilder).reduce((total, [builderName, document]) => {
      const validationErrors = validate(mergedSchemas, document)

      if (validationErrors.length > 0) {
        logger.error(
          `Toolbelt generated an invalid document definition for queries in builder "${builderName}". Please, open an issue.`
        )
        return total
      }

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

      return total + countFiles
    }, 0)

    try {
      if ((await fs.promises.stat(path.join(root, GENERATED_GRAPHQL_DIRNAME))).isDirectory()) {
        // this is an empty generated directory, remove
        // to reduce clutter
        await fs.promises.rmdir(path.join(root, GENERATED_GRAPHQL_DIRNAME))
      }
    } catch (err) {
      // ignore
    }

    if (totalFiles > 0) {
      logger.info(`Successfully generated ${totalFiles} GraphQL type file(s).`)
    } else {
      logger.info('No GraphQL type files were generated.')
    }
  } catch (err) {
    logger.error('Failed to generate GraphQL type files')
    logger.debug(err)
  }
}
