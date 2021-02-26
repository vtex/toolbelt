import { IOContext } from '@vtex/api'
import { getGraphQLDocuments, shouldGenerateTypes } from './graphql/getGraphQLDocuments'
import { generateSchema } from './graphql/generateSchema'
import logger from '../../api/logger'
import { generateTypeFiles } from './graphql/generateTypeFiles'
import { SessionManager } from '../../api/session'
import * as env from '../../api/env'
import userAgent from '../../user-agent'
import { dummyLogger } from '../../api/dummyLogger'

const getContext = () => {
  const { account, workspace, token } = SessionManager.getSingleton()
  return {
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
}

export async function setupGraphQL(manifest: Manifest, builders?: string[]) {
  try {
    const context: IOContext = getContext()

    if (!shouldGenerateTypes(manifest, builders)) return

    const documents = await getGraphQLDocuments(builders)

    if (!documents.length) return

    const schema = await generateSchema(manifest, context)

    if (!schema) return logger.warn('Could not resolve any GraphQL app schema. Aborting GraphQL types generation.')

    const generatedFilesCount = await generateTypeFiles(documents, schema)

    if (!generatedFilesCount) return logger.info('No GraphQL type files were generated.')

    return logger.info(`Successfully generated ${generatedFilesCount} GraphQL type file(s).`)
  } catch (err) {
    logger.error('Failed to generate GraphQL type files')
    logger.debug(err)
  }
}
