import {dirnameJoin} from '../../file'

export default {
  io: {
    list: {
      alias: 'ls',
      module: dirnameJoin('modules/io/list'),
    },
    install: {
      alias: 'i',
      module: dirnameJoin('modules/io/install'),
    },
  },
}
