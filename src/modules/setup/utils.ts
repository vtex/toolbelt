import { outputJsonSync, readJsonSync } from 'fs-extra'
import { getAppRoot } from '../../manifest'
import path from 'path'

type Files = 'tsconfig' | 'esLintrc' | 'packageJson'

const paths: Record<Files, (builder: string) => string> = {
  tsconfig: (builder: string) => path.join(getAppRoot(), builder, 'tsconfig.json'),
  esLintrc: (builder: string) => path.join(getAppRoot(), builder, '.eslintrc'),
  packageJson: (builder: string) => path.join(getAppRoot(), builder, 'package.json'),
}

class FileReaderWriter {
  constructor(private file: Files) {}

  public path = (builder: string) => {
    return paths[this.file](builder)
  }

  public read = (builder: string) => {
    return readJsonSync(this.path(builder))
  }

  public write = (builder: string, data: any) => {
    return outputJsonSync(this.path(builder), data, { spaces: 2 })
  }
}

export const packageJsonEditor = new FileReaderWriter('packageJson')
export const esLintrcEditor = new FileReaderWriter('esLintrc')
export const tsconfigEditor = new FileReaderWriter('tsconfig')
