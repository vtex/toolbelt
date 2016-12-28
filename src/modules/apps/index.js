import {dirnameJoin} from '../../file'

export default {
  link: {
    module: dirnameJoin('modules/apps/link'),
  },
  unlink: {
    module: dirnameJoin('modules/apps/unlink'),
  },
  add: {
    module: dirnameJoin('modules/apps/add'),
  },
  watch: {
    module: dirnameJoin('modules/apps/watch'),
  },
  publish: {
    module: dirnameJoin('modules/apps/publish'),
  },
  install: {
    alias: 'i',
    module: dirnameJoin('modules/apps/install'),
  },
  uninstall: {
    module: dirnameJoin('modules/apps/uninstall'),
  },
  list: {
    alias: 'ls',
    module: dirnameJoin('modules/apps/list'),
  },
  settings: {
    module: dirnameJoin('modules/apps/settings'),
  },
}
