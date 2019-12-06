import axios from 'axios'
import { outputJsonSync, readJsonSync, readFileSync, outputFileSync } from 'fs-extra'
import path from 'path'
import { pipeline } from 'stream'
import tar from 'tar'
import util from 'util'
import { getToken } from '../../conf'
import { getAppRoot } from '../../manifest'

export const checkIfTarGzIsEmpty = (url: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(url, { responseType: 'stream', headers: { Authorization: getToken() } })
      let fileCount = 0
      const fileEmitter = tar.list()
      fileEmitter.on('entry', () => (fileCount += 1))
      await util.promisify(pipeline)([res.data, fileEmitter])
      resolve(fileCount === 0)
    } catch (err) {
      reject(err)
    }
  })
}

type Files = 'tsconfig' | 'esLintrc' | 'packageJson' | 'eslintIgnore' | 'prettierrc'

const paths: Record<Files, (builder: string) => string> = {
  tsconfig: (builder: string) => path.join(getAppRoot(), builder, 'tsconfig.json'),
  esLintrc: (builder: string) => path.join(getAppRoot(), builder, '.eslintrc.json'),
  packageJson: (builder: string) => path.join(getAppRoot(), builder, 'package.json'),
  eslintIgnore: (builder: string) => path.join(getAppRoot(), builder, '.eslintignore'),
  prettierrc: (builder: string) => path.join(getAppRoot(), builder, '.prettierrc'),
}

class FileReaderWriter {
  constructor(private file: Files, private isJSON = true) {}

  public path = (builder: string) => {
    return paths[this.file](builder)
  }

  public read = (builder: string) => {
    if (this.isJSON) {
      return readJsonSync(this.path(builder))
    }

    return readFileSync(this.path(builder))
  }

  public write = (builder: string, data: any) => {
    if (this.isJSON) {
      return outputJsonSync(this.path(builder), data, { spaces: 2 })
    }

    return outputFileSync(this.path(builder), data)
  }
}

export const packageJsonEditor = new FileReaderWriter('packageJson')
export const esLintrcEditor = new FileReaderWriter('esLintrc')
export const tsconfigEditor = new FileReaderWriter('tsconfig')
export const eslintIgnoreEditor = new FileReaderWriter('eslintIgnore', false)
export const prettierrcEditor = new FileReaderWriter('prettierrc')
