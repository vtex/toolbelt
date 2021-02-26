import fs from 'fs'
import glob from 'globby'
import chalk from 'chalk'

import { getAppRoot } from '../../../api/manifest'
import { GENERATED_GRAPHQL_DIRNAME, GRAPHQL_GLOBAL_TYPES_FILE } from '../consts'
import { DefinitionNode, DocumentNode, GraphQLSchema, Kind, printError, validate } from 'graphql'
import logger from '../../../api/logger'
import generate from 'apollo/lib/generate'
import path from 'path'

const removeGeneratedFiles = async (): Promise<void> => {
  const root = getAppRoot()
  const generatedFiles = await glob(`**/${GENERATED_GRAPHQL_DIRNAME}/*`, { cwd: root })

  await Promise.all(generatedFiles.map(filePath => fs.promises.unlink(filePath)))
}

const formatDocumentsByBuilderName = ([imports, document]: [DefinitionNode[], DocumentNode]) => {
  const root = getAppRoot()
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
}

const builderDocumentsObjToArray = (acc: [], operationsByBuilder: Record<string, DefinitionNode[]>) => [
  ...acc,
  ...Object.entries(operationsByBuilder),
]

/*
  remove possible duplicate definitions. this is necessary because
  the way we allow imports of shared graphql files, so, if two documents
  imports the same file (e.g. a shared Fragment definition), the fragment
  will be included twice (one time for each module that imports it), so
  we need to remove these duplicates.
*/
const findDuplicatedDocuments = (
  acc: Record<string, DocumentNode>,
  [builderName, operations]: [string, DefinitionNode[]]
) => {
  const builderDefinitions = acc[builderName]?.definitions ?? []

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
}

const groupDocumentsByBuilder = (documents: ReadonlyArray<[DefinitionNode[], DocumentNode]>) => {
  return documents
    .map(formatDocumentsByBuilderName)
    .reduce<Array<[string, DefinitionNode[]]>>(builderDocumentsObjToArray, [])
    .reduce<{ [builder: string]: DocumentNode }>(findDuplicatedDocuments, {})
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

const generateFiles = (documents: ReadonlyArray<[DefinitionNode[], DocumentNode]>, schema: GraphQLSchema): number => {
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

export const generateTypeFiles = async (
  documents: ReadonlyArray<[DefinitionNode[], DocumentNode]>,
  schema: GraphQLSchema
) => {
  // remove previously generated files before generating new ones
  await removeGeneratedFiles()

  const generatedFilesCount = generateFiles(documents, schema)

  await handleEmptyGeneratedDirectory()

  return generatedFilesCount
}
