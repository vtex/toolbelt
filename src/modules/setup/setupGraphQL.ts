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
  DocumentNode,
  DefinitionNode,
  Kind,
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

    const graphQLDocuments = (
      await Promise.all(
        graphQLFiles.map(filePath => fs.promises.readFile(filePath).then(buffer => [filePath, buffer.toString()]))
      )
    )
      .map(([filePath, source]) => [filePath, source, resolveImports(source, filePath)] as const)
      .map(([filePath, source, imports]) => [imports, parse(new Source(source, path.join(root, filePath)))] as const)

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
