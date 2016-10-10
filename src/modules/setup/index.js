import {dirnameJoin} from '../../file'

export default {
  setup: {
    eslint: {
      module: dirnameJoin('modules/setup/eslint'),
    },
  },
}
