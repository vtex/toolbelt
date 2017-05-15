import {dirnameJoin} from '../../file'

export default {
  deps: {
    list: {
      alias: 'ls',
      module: dirnameJoin('modules/deps/list'),
    },
    update: {
      module: dirnameJoin('modules/deps/update'),
    },
  },
}
