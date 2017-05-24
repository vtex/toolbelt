import {dirnameJoin} from '../../file'

export default {
  local: {
    eslint: {
      module: dirnameJoin('modules/local/eslint'),
    },
    package: {
      module: dirnameJoin('modules/local/package'),
    },
    manifest: {
      module: dirnameJoin('modules/local/manifest'),
    },
  },
}
