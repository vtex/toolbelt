import {dirnameJoin} from '../../file'

export default {
  login: {
    module: dirnameJoin('modules/auth/login'),
  },
  logout: {
    module: dirnameJoin('modules/auth/logout'),
  },
  switch: {
    module: dirnameJoin('modules/auth/switch'),
  },
  whoami: {
    module: dirnameJoin('modules/auth/whoami'),
  },
}
