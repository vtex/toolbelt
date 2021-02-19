import { IOGraphQLClient, IOContext } from '@vtex/api'
import glob from 'globby'
import {
  buildClientSchema,
  DefinitionNode,
  DocumentNode,
  getIntrospectionQuery,
  GraphQLSchema,
  IntrospectionQuery,
  Kind,
  parse,
  printError,
  Source,
  validate,
} from 'graphql'
import chalk from 'chalk'
import { AxiosError } from 'axios'
import generate from 'apollo/lib/generate'
import fs from 'fs'
import path from 'path'

import { createRegistryClient } from '../../api/clients/IOClients/infra'
import logger from '../../api/logger'
import { getAppRoot } from '../../api/manifest'

import { BUILDERS_WITH_GRAPHQL_QUERIES, GENERATED_GRAPHQL_DIRNAME, GRAPHQL_GLOBAL_TYPES_FILE } from './consts'
import { SessionManager } from '../../api/session'
import * as env from '../../api/env'
import userAgent from '../../user-agent'
import { dummyLogger } from '../../api/dummyLogger'
import { mergeSchemas } from 'graphql-tools'

// the only way to consume the GraphQL from an app is to extend
// the `AppGraphQLClient` class, because the `this.graphql` field
// is protected and can't be accessed outside it.
class GraphQLIntrospectionClient extends IOGraphQLClient {
  constructor(appName: string, context: IOContext) {
    super(context, {
      baseURL: `https://${context.workspace}--${context.account}.myvtex.com/_v/private/${appName}`,
      timeout: 5000,
    })
  }

  public async introspect() {
    const response = await this.http.post<{ data: IntrospectionQuery }>('/graphiql/v1', {
      query: getIntrospectionQuery(),
    })
    return response.data
  }
}

export const getGraphQLDependencies = async (manifest: Manifest, context: IOContext) => {
  // if the app has a graphql builder, we should include it
  // in the dependencies for the schema introspection, since the
  // builders that can query server could query it's own server.
  const shouldIncludeSelf = 'graphql' in manifest.builders
  const appDependencies = Object.entries(manifest.dependencies)
  const dependencies = shouldIncludeSelf
    ? [[`${manifest.vendor}.${manifest.name}`, manifest.version], ...appDependencies]
    : appDependencies

  const registry = createRegistryClient(context)
  try {
    const dependenciesManifest = await Promise.all(
      dependencies.map(([dependentApp, dependencyVersion]) => registry.getAppManifest(dependentApp, dependencyVersion))
    )
    return dependenciesManifest.filter(appManifest => 'graphql' in appManifest.builders)
  } catch (err) {
    logger.error('Failed to get dependencies GraphQL')
    logger.debug(err)
    return []
  }
}

const getIntrospectionDetailedError = err => {
  if ('config' in err) {
    const axiosError = err as AxiosError
    if (axiosError.response && axiosError.response.status === 400) return 'It may not support the introspection query.'
    return 'Timeout limit exceeded.'
  }
  return 'Is it linked of installed in this account and workspace?'
}

const introspectDependency = (context: IOContext) => async (appName: string) => {
  try {
    const graphQLIntrospectionClient = new GraphQLIntrospectionClient(appName, context)

    const introspectionResult = await graphQLIntrospectionClient.introspect()
    return buildClientSchema(introspectionResult)
  } catch (err) {
    logger.error(
      chalk`Could not resolve GraphQL schema for app {bold ${appName}}. ${getIntrospectionDetailedError(err)}`
    )
    logger.debug(err.message, err.stack)
    return undefined
  }
}

const getDependenciesSchemas = async (dependenciesManifest: Manifest[], context: IOContext) => {
  return (
    await Promise.all(
      dependenciesManifest.map(app => `${app.vendor}.${app.name}@${app.version}`).map(introspectDependency(context))
    )
  ).filter(Boolean)
}

const getGraphQLFiles = async (builders: string[]) => {
  const root = getAppRoot()

  // retrieves all GraphQL documents in the builder folder. ideally we should
  // only use the files that the app requires (i.e. only the queries imported
  // by the React components), but we can get by with this for now.
  return glob(`+(${builders.join('|')})/**/*.{graphql,gql}`, { cwd: root })
}

/**
 * parses all files into a GraphQL document
 */
const generateGraphQLDocuments = async (
  graphQLFiles: string[]
): Promise<ReadonlyArray<[DefinitionNode[], DocumentNode]>> => {
  const root = getAppRoot()

  return (
    await Promise.all(
      graphQLFiles.map(filePath => fs.promises.readFile(filePath).then(buffer => [filePath, buffer.toString()]))
    )
  )
    .map(([filePath, source]) => [filePath, source, resolveImports(source, filePath)] as const)
    .map(([filePath, source, imports]) => [imports, parse(new Source(source, path.join(root, filePath)))])
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

const removeGeneratedFiles = async (): Promise<void> => {
  const root = getAppRoot()
  const generatedFiles = await glob(`**/${GENERATED_GRAPHQL_DIRNAME}/*`, { cwd: root })

  await Promise.all(generatedFiles.map(filePath => fs.promises.unlink(filePath)))
}

const getGraphQLDocuments = async (builders: string[]): Promise<ReadonlyArray<[DefinitionNode[], DocumentNode]>> => {
  const graphQLFiles = await getGraphQLFiles(builders)
  if (!graphQLFiles) return []
  return generateGraphQLDocuments(graphQLFiles)
}

const getValidGraphqlDocuments = (
  graphQLDocuments: ReadonlyArray<[DefinitionNode[], DocumentNode]>,
  schema: GraphQLSchema
): ReadonlyArray<[DefinitionNode[], DocumentNode]> => {
  const root = getAppRoot()
  return graphQLDocuments.filter(([imports, document]) => {
    const [operationDefinition] = document.definitions

    const {
      loc: {
        source: { name: operationName },
      },
    } = operationDefinition

    const fileName = path.relative(root, operationName)

    const validationErrors = validate(schema, {
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
}

const groupDocumentsByBuilder = (documents: ReadonlyArray<[DefinitionNode[], DocumentNode]>) => {
  const root = getAppRoot()
  return documents
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
}

const generateTypeFiles = (
  documents: ReadonlyArray<[DefinitionNode[], DocumentNode]>,
  schema: GraphQLSchema
): number => {
  const root = getAppRoot()
  const documentsByBuilder = Object.entries(groupDocumentsByBuilder(getValidGraphqlDocuments(documents, schema)))
  return documentsByBuilder.reduce((total, [builderName, document]) => {
    const validationErrors = validate(schema, document)

    if (validationErrors.length > 0) {
      logger.error(
        `Toolbelt generated an invalid document definition for queries in builder "${builderName}". Please, open an issue.`
      )
      return total
    }
    const filesCreated = generate(
      // source document
      document,
      // project schema
      schema,
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
    return total + filesCreated
  }, 0)
}

const handleEmptyGeneratedDirectory = async () => {
  const root = getAppRoot()
  try {
    if ((await fs.promises.stat(path.join(root, GENERATED_GRAPHQL_DIRNAME))).isDirectory()) {
      // this is an empty generated directory, remove
      // to reduce clutter
      await fs.promises.rmdir(path.join(root, GENERATED_GRAPHQL_DIRNAME))
    }
  } catch {
    // ignore
  }
}

export const setupGraphql = async (manifest: Manifest, builders = BUILDERS_WITH_GRAPHQL_QUERIES) => {
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
  const appBuilders = Object.keys(manifest.builders || {})

  // we should generate these types if the app includes
  // builders which can query GraphQL server.
  const needGraphQLTypes = appBuilders.some(builderName => builders.includes(builderName))

  if (!needGraphQLTypes || !manifest.dependencies) return

  try {
    const graphQLDocuments = await getGraphQLDocuments(builders)

    if (!graphQLDocuments.length) return

    const graphqlDependencies = await getGraphQLDependencies(manifest, context)
    const dependenciesSchemas = await getDependenciesSchemas(graphqlDependencies, context)

    if (!dependenciesSchemas.length) {
      logger.warn('Could not resolve any GraphQL app schema. Aborting GraphQL types generation.')
      return
    }

    const mergedSchemas = mergeSchemas({ schemas: dependenciesSchemas })

    // remove previously generated files before generating new ones
    await removeGeneratedFiles()

    const generatedFilesCount = generateTypeFiles(graphQLDocuments, mergedSchemas)

    await handleEmptyGeneratedDirectory()

    if (generatedFilesCount > 0) {
      logger.info(`Successfully generated ${generatedFilesCount} GraphQL type file(s).`)
    } else {
      logger.info('No GraphQL type files were generated.')
    }
  } catch (err) {
    console.log(err)
    logger.error('Failed to generate GraphQL type files')
    logger.debug(err)
  }
}
