import {help} from 'findhelp'
import pkg from '../../package.json'
import {greeting} from '../greeting'
import apps from './apps'
import auth from './auth'
import workspace from './workspace'
// import masterdata from './masterdata'
// import render from './render'

export default {
  ...auth,
  ...apps,
  ...workspace,
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
