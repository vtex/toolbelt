import { IOContext } from '@vtex/api'
import { mergeSchemas } from 'graphql-tools'

import { BUILDERS_WITH_GRAPHQL_QUERIES } from './consts'
import * as env from '../../api/env'
import userAgent from '../../user-agent'
import { dummyLogger } from '../../api/dummyLogger'
import logger from '../../api/logger'
import { SessionManager } from '../../api/session'
import {
  generateTypeFiles,
  getDependenciesSchemas,
  getGraphQLDependencies,
  getGraphQLDocuments,
  handleEmptyGeneratedDirectory,
  removeGeneratedFiles,
} from './builder/utils'

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

export async function setupGraphQL(manifest: Manifest, builders = BUILDERS_WITH_GRAPHQL_QUERIES) {
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
