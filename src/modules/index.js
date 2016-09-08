import apps from './apps'
import auth from './auth'
import init from './init'
import setup from './setup'
import {help} from 'findhelp'
import {Promise} from 'bluebird'
import workspace from './workspace'
import pkg from '../../package.json'
import {greeting} from '../greeting'

export default {
  ...auth,
  ...apps,
  ...workspace,
  ...setup,
  ...init,
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
