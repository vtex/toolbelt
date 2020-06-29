import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

import { getAppRoot } from '../../../api/manifest'

type Files = 'tsconfig' | 'eslintrc' | 'packageJson' | 'eslintIgnore' | 'prettierrc'

const FILE_PATHS: Record<Files, (builder: string) => string> = {
  tsconfig: (builder: string) => join(getAppRoot(), builder, 'tsconfig.json'),
  eslintrc: (builder: string) => join(getAppRoot(), builder, '.eslintrc'),
  packageJson: (builder: string) => join(getAppRoot(), builder, 'package.json'),
  eslintIgnore: (builder: string) => join(getAppRoot(), builder, '.eslintignore'),
  prettierrc: (builder: string) => join(getAppRoot(), builder, '.prettierrc'),
}

export class FileReaderWriter {
  constructor(private file: Files, private isJSON = true) {}

  public path = (builder: string) => {
    return FILE_PATHS[this.file](builder)
  }

  public read = (builder: string) => {
    if (this.isJSON) {
      return JSON.parse(readFileSync(this.path(builder)).toString())
    }

    return readFileSync(this.path(builder))
  }

  public write = (builder: string, data: any) => {
    if (this.isJSON) {
      return writeFileSync(this.path(builder), JSON.stringify(data, null, 2))
    }

    return writeFileSync(this.path(builder), data)
  }
}
