import { AppGraphQLClient, IOContext } from '@vtex/api'
import { buildClientSchema, getIntrospectionQuery, IntrospectionQuery } from 'graphql'
import { AxiosError } from 'axios'
import chalk from 'chalk'
import { mergeSchemas } from 'graphql-tools'

import { createRegistryClient } from '../../../api/clients/IOClients/infra'
import logger from '../../../api/logger'

/*
  the only way to consume the GraphQL from an app is to extend
  the `AppGraphQLClient` class, because the `this.graphql` field
  is protected and can't be accessed outside it.
*/
class GraphQLIntrospectionClient extends AppGraphQLClient {
  constructor(appName: string, context: IOContext) {
    super(appName, context, { timeout: 10000 })
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

export const getGraphQLDependencies = async (manifest: Manifest, context: IOContext) => {
  /*
    if the app has a graphql builder, we should include it
    in the dependencies for the schema introspection, since the
    builders that can query server could query it's own server.
  */
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

/*
  app that uses old vtex/api versions doesn't have this scalar declared,
  but uses it as a type. to avoid migrate all the apps, this function inject
  it in introspection result
*/

const addIOMissingTypes = (result: IntrospectionQuery) => {
  return {
    __schema: {
      ...result.__schema,
      types: [
        ...result.__schema.types,
        {
          kind: 'SCALAR' as 'SCALAR',
          name: 'CustomIOSanitizedString',
          description: 'Missing Scalar type',
        },
      ],
    },
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
    return buildClientSchema(addIOMissingTypes(introspectionResult))
  } catch (err) {
    logger.error(
      chalk`Could not resolve GraphQL schema for app {bold ${appName}}. ${getIntrospectionDetailedError(err)}`
    )
    logger.debug(err.message, err.stack)
    return undefined
  }
}

/*
  this fix custom client side directives like @context
*/
const injectCustomClientDirectives = schemas => {
  const customClientDirectives = `
    enum IOCacheControlScope {
      segment
      public
      private
    }
    directive @context(provider: String, scope: IOCacheControlScope) on FIELD_DEFINITION | FIELD
  `
  return [...schemas, customClientDirectives]
}

const getDependenciesSchemas = async (dependenciesManifest: Manifest[], context: IOContext) => {
  const schemas = (
    await Promise.all(
      dependenciesManifest.map(app => `${app.vendor}.${app.name}@${app.version}`).map(introspectDependency(context))
    )
  ).filter(Boolean)

  return injectCustomClientDirectives(schemas)
}

export const generateSchema = async (manifest: Manifest, context: IOContext) => {
  const graphqlDependencies = await getGraphQLDependencies(manifest, context)
  const dependenciesSchemas = await getDependenciesSchemas(graphqlDependencies, context)

  if (!dependenciesSchemas.length) return null

  return mergeSchemas({ schemas: dependenciesSchemas, mergeDirectives: true })
}
