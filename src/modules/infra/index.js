import {dirnameJoin} from '../../file'

export default {
  infra: {
    ls: {
      module: dirnameJoin('modules/infra/list'),
    },
    install: {
      module: dirnameJoin('modules/infra/install'),
    },
  },
}
