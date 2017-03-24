import {dirnameJoin} from '../../file'

export default {
  infra: {
    list: {
      alias: 'ls',
      module: dirnameJoin('modules/infra/list'),
    },
    install: {
      alias: 'i',
      module: dirnameJoin('modules/infra/install'),
    },
    update: {
      module: dirnameJoin('modules/infra/update'),
    },
  },
}
