import {help} from 'findhelp'
import pkg from '../../package.json'
import {greeting} from '../greeting'
import * as apps from './apps'
import * as auth from './auth'
import * as workspace from './workspace'
// import * as masterdata from './masterdata'
// import * as render from './render'

export const tree = {
  ...auth.default,
  ...apps.default,
  ...workspace.default,
  'options': [
    {
      'short': 'h',
      'long': 'help',
      'description': 'show help information',
      'type': 'boolean',
    },
  ],
  handler: function (options) {
    if (options.h || options.help) {
      console.log(help(this, pkg))
    } else if (options.v || options.version) {
      console.log(pkg.version)
    } else {
      console.log(`  ${greeting.join('\n  ')}`)
      console.log(help(this, pkg))
    }
  },
}
