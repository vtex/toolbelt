import { lstat, readdir, realpath, Stats } from 'fs-extra'
import glob from 'globby'
import { dirname, join } from 'path'
import { partition, unnest } from 'ramda'
import log from '../logger'

const isScopedDirOrLink = (path: string, stats: Stats) => {
  return stats != null && ((path.startsWith('@') && stats.isDirectory()) || stats.isSymbolicLink())
}

const isLink = (_: string, stats: Stats) => {
  return stats?.isSymbolicLink()
}

const isScopedModule = (dirName: string) => {
  return dirName.startsWith('@')
}

export class YarnSymlinkedModulesConfig {
  public static async createConfig(projectSrc: string) {
    const conf = new YarnSymlinkedModulesConfig(projectSrc)
    await conf.init()
    return conf
  }

  private stack = []
  private graph: Record<string, string[]> = {}
  private _metadata: Record<string, string> = {}

  constructor(private projectSrc: string) {}

  get metadata() {
    return this._metadata
  }

  get symlinkedDepsDirs() {
    return Object.values(this.metadata)
  }

  get symlinkedModules() {
    return Object.keys(this.metadata)
  }

  get symlinkedDependencies() {
    return Object.keys(this.metadata).map((moduleName: string) => {
      return {
        moduleName,
        path: this.metadata[moduleName],
      }
    })
  }

  public async init() {
    const allPackageJsonsFolders = (await glob([join('*', 'package.json')], { cwd: this.projectSrc })).map(dirname)
    this.stack.push(...allPackageJsonsFolders)
    while (this.stack.length > 0) {
      const moduleFolder = this.stack.pop()
      // eslint-disable-next-line no-await-in-loop
      const dependencies = await this.discoverDependencies(moduleFolder)
      this.graph[moduleFolder] = dependencies
      this.addSubDependenciesToStack(dependencies)
    }
  }

  public toJson() {
    return JSON.stringify({
      metadata: this.metadata,
      graph: this.graph,
    })
  }

  private async discoverDependencies(currentModule: string): Promise<string[]> {
    const path = currentModule in this._metadata ? this._metadata[currentModule] : join(this.projectSrc, currentModule)
    const depsRoot = join(path, 'node_modules')
    const submodules = await this.getAllLinkedModules(depsRoot)
    const realPaths = await Promise.all(
      submodules.map((submoduleName: string) => this.getModuleRealPath(submoduleName, depsRoot))
    )

    this.addModulesMetadata(realPaths)
    return realPaths.map(([moduleName]) => moduleName)
  }

  private async getModuleRealPath(moduleName: string, depsRoot: string): Promise<[string, string]> {
    return [moduleName, await realpath(join(depsRoot, ...moduleName.split('/')))]
  }

  private async getAllLinkedModules(root: string): Promise<string[]> {
    try {
      const npmDirs = await this.getDirs(root, isScopedDirOrLink)
      const [scopedDirectories, regularModules] = partition(isScopedModule, npmDirs)
      const modulesPerScope = await Promise.all(
        scopedDirectories.map((scopedDir: string) => this.getLinkedScopedModules(root, scopedDir))
      )

      return [...regularModules, ...unnest(modulesPerScope)]
    } catch (err) {
      return []
    }
  }

  private async getLinkedScopedModules(root: string, scopedDir: string) {
    const dirs = await this.getDirs(join(root, scopedDir), isLink)
    return dirs.map(dir => `${scopedDir}/${dir}`)
  }

  private async getDirs(root: string, isWantedPath: (path: string, stats: Stats) => boolean): Promise<string[]> {
    const nullifyInvalidAndUnwantedPaths = async (path: string) => {
      try {
        const stats = await lstat(join(root, path))
        return isWantedPath(path, stats) ? path : null
      } catch (err) {
        return null
      }
    }

    const allDirs = await readdir(root)
    const validAndNullDirs = await Promise.all(allDirs.map(nullifyInvalidAndUnwantedPaths))
    return validAndNullDirs.filter(dir => dir != null)
  }

  private addSubDependenciesToStack(deps: string[]) {
    deps.forEach(dep => {
      if (dep in this.graph) {
        return
      }

      this.stack.push(dep)
      this.graph[dep] = []
    })
  }

  private addModulesMetadata(modulesRealPaths: Array<[string, string]>) {
    modulesRealPaths.forEach(([moduleName, path]) => {
      if (moduleName in this._metadata && this._metadata[moduleName] !== path) {
        log.warn(`Found ${moduleName} from two sources as linked dependencies. Ignoring the one from ${path}`)
      } else {
        this._metadata[moduleName] = path
      }
    })
  }
}
