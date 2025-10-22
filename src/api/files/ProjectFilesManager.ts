import { createReadStream, lstat, readFileSync, statSync } from 'fs-extra'
import glob from 'globby'
import { join } from 'path'
import { reject } from 'ramda'
import { PassThrough } from 'stream'
import { BatchStream } from '../typings/types'

/**
 * Expands environment variables in .npmrc file content
 * @param content The original .npmrc file content
 * @returns The content with environment variables expanded
 */
const expandEnvironmentVariables = (content: string): string => {
  return content.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const value = process.env[envVar]
    if (value === undefined) {
      throw new Error(`Environment variable ${envVar} is not defined`)
    }
    return value
  })
}

/**
 * Creates a stream from a string
 * @param str The string to convert to a stream
 * @returns A readable stream
 */
const stringToStream = (str: string) => {
  const stream = new PassThrough()
  stream.end(str)
  return stream
}

export const createPathToFileObject = (root: string, prefix = '') => {
  return (path: string): BatchStream => {
    const realAbsolutePath = join(root, path)
    const stats = statSync(realAbsolutePath)

    // Check if this is a .npmrc file that needs environment variable expansion
    if (path.endsWith('.npmrc')) {
      try {
        const originalContent = readFileSync(realAbsolutePath, 'utf8')
        const expandedContent = expandEnvironmentVariables(originalContent)
        const expandedStream = stringToStream(expandedContent)

        return {
          path: join(prefix, path),
          content: expandedStream,
          byteSize: Buffer.byteLength(expandedContent, 'utf8'),
        }
      } catch (error) {
        // If environment variable expansion fails, fall back to original file
        console.warn(`Warning: Failed to expand environment variables in ${path}: ${error.message}`)
        return {
          path: join(prefix, path),
          content: createReadStream(realAbsolutePath),
          byteSize: stats.size,
        }
      }
    }

    // For all other files, use the original behavior
    return {
      path: join(prefix, path),
      content: createReadStream(realAbsolutePath),
      byteSize: stats.size,
    }
  }
}

export class ProjectFilesManager {
  private static readonly DEFAULT_IGNORED_FILES = [
    '.DS_Store',
    'README.md',
    '.gitignore',
    'package.json',
    'node_modules/**',
    '**/node_modules/**',
    '.git/**',
  ]

  private static isTestOrMockPath = (path: string) => {
    return /.*(test|mock|snapshot).*/.test(path.toLowerCase())
  }

  public root: string
  constructor(projectRoot: string) {
    this.root = projectRoot
  }

  private getIgnoredPaths(test = false): string[] {
    try {
      const filesToIgnore = readFileSync(join(this.root, '.vtexignore'))
        .toString()
        .split('\n')
        .map(path => path.trim())
        .filter(path => path !== '')
        .map(path => path.replace(/\/$/, '/**'))
        .concat(ProjectFilesManager.DEFAULT_IGNORED_FILES)
      return test ? reject(ProjectFilesManager.isTestOrMockPath, filesToIgnore) : filesToIgnore
    } catch (e) {
      return ProjectFilesManager.DEFAULT_IGNORED_FILES
    }
  }

  public async getLocalFiles(test = false): Promise<string[]> {
    const files: string[] = await glob(['manifest.json', 'policies.json', '.npmrc', 'node/.*', 'react/.*'], {
      cwd: this.root,
      follow: true,
      ignore: this.getIgnoredPaths(test),
      nodir: true,
    })

    const filesStats = await Promise.all(
      files.map(async file => {
        const stats = await lstat(join(this.root, file))
        return { file, stats }
      })
    )

    return filesStats.reduce((acc, { file, stats }) => {
      if (stats.size > 0) {
        acc.push(file)
      }
      return acc
    }, [])
  }
}
