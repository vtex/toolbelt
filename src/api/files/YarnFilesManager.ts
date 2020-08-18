import glob from 'globby'
import { join, resolve } from 'path'
import { PassThrough } from 'stream'
import log from '../logger'
import { createPathToFileObject } from './ProjectFilesManager'
import { YarnSymlinkedModulesConfig } from './YarnLinkedFilesConfig'
import { BatchStream } from '../typings/types'

const stringToStream = (str: string) => {
  const stream = new PassThrough()
  stream.end(str)
  return stream
}

export class YarnFilesManager {
  private static readonly LINKED_YARN_MODULES_IGNORED_FILES = [
    '.DS_Store',
    'README.md',
    '.gitignore',
    'CHANGELOG.md',
    'node_modules/**',
    '**/node_modules/**',
  ]

  private static readonly BUILDER_HUB_LINKED_DEPS_DIR = '.linked_deps'
  private static readonly BUILDER_HUB_LINKED_DEPS_CONFIG_PATH = join(
    YarnFilesManager.BUILDER_HUB_LINKED_DEPS_DIR,
    '.config'
  )

  public static async createFilesManager(projectSrc: string) {
    const yarnLinkedModulesConfig = await YarnSymlinkedModulesConfig.createConfig(projectSrc)
    return new YarnFilesManager(yarnLinkedModulesConfig)
  }

  private static async getFiles(npmModule: string, path: string) {
    const files = await glob(['**'], {
      cwd: path,
      ignore: YarnFilesManager.LINKED_YARN_MODULES_IGNORED_FILES,
      nodir: true,
    })
    return files.map(
      createPathToFileObject(path, join(YarnFilesManager.BUILDER_HUB_LINKED_DEPS_DIR, npmModule))
    ) as BatchStream[]
  }

  constructor(private linkConfig: YarnSymlinkedModulesConfig) {}

  get symlinkedDepsDirs() {
    return this.linkConfig.symlinkedDepsDirs
  }

  get yarnLinkedDependencies() {
    return this.linkConfig.symlinkedDependencies
  }

  public async getYarnLinkedFiles(): Promise<BatchStream[]> {
    const npmModules = this.linkConfig.symlinkedModules
    const filesPerNpmModule = await Promise.all(
      npmModules.map(npmModule => {
        return YarnFilesManager.getFiles(npmModule, this.linkConfig.metadata[npmModule])
      })
    )

    const npmModulesFiles = filesPerNpmModule.reduce((acc, moduleFiles) => {
      return acc.concat(...moduleFiles)
    }, [])

    if (npmModulesFiles.length === 0) {
      return []
    }

    const configJson = this.linkConfig.toJson()
    npmModulesFiles.push({
      path: YarnFilesManager.BUILDER_HUB_LINKED_DEPS_CONFIG_PATH,
      content: stringToStream(configJson),
      byteSize: Buffer.byteLength(configJson),
    } as BatchStream)

    return npmModulesFiles
  }

  public logSymlinkedDependencies() {
    const linkedDeps = this.yarnLinkedDependencies
    if (!linkedDeps.length) {
      return
    }

    const plural = linkedDeps.length > 1
    log.info(`The following local dependenc${plural ? 'ies are' : 'y is'} linked to your app:`)
    linkedDeps.forEach(({ moduleName, path }) => log.info(`${moduleName} (from: ${path})`))
    log.info(
      `If you don't want ${plural ? 'them' : 'it'} to be used by your vtex app, please unlink ${plural ? 'them' : 'it'}`
    )
  }

  public maybeMapLocalYarnLinkedPathToProjectPath = (path: string, projectPath: string) => {
    const absolutePath = resolve(projectPath, path)
    const linkedModules = this.yarnLinkedDependencies
    for (const moduleInfo of linkedModules) {
      if (absolutePath.startsWith(moduleInfo.path)) {
        return absolutePath.replace(
          moduleInfo.path,
          join(YarnFilesManager.BUILDER_HUB_LINKED_DEPS_DIR, moduleInfo.moduleName)
        )
      }
    }

    return path
  }
}
