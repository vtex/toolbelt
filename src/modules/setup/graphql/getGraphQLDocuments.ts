import { DefinitionNode, DocumentNode, parse, Source } from 'graphql'
import fs from 'fs'
import path from 'path'
import glob from 'globby'
import { getAppRoot } from '../../../api/manifest'

/*
  Resolve the imports of a GraphQL document and return them as
  an array of definition node.
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

/*
  parses all files into a GraphQL document
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

/*
  retrieves all GraphQL documents in the builder folder. ideally we should
  only use the files that the app requires (i.e. only the queries imported
  by the React components), but we can get by with this for now.
*/

const getGraphQLFiles = async (builders: string[]) => {
  const root = getAppRoot()

  return glob([`+(${builders.join('|')})/**/*.{graphql,gql}`, '!**/node_modules'], { cwd: root })
}

export const getGraphQLDocuments = async (
  builders: string[]
): Promise<ReadonlyArray<[DefinitionNode[], DocumentNode]>> => {
  const graphQLFiles = await getGraphQLFiles(builders)
  if (!graphQLFiles) return []
  return generateGraphQLDocuments(graphQLFiles)
}

/*
  we should generate these types if the app includes
  builders which can query GraphQL server.
*/
export const shouldGenerateTypes = (manifest: Manifest, builders: string[]) => {
  if (!manifest.dependencies) return false
  const appBuilders = Object.keys(manifest.builders || {})

  return appBuilders.some(builderName => builders.includes(builderName))
}
