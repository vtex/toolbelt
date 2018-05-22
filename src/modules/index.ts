import { help } from 'findhelp'

import * as pkg from '../../package.json'
import { greeting } from '../greeting'
import tree from './tree'

export default (options) => {
  if (options.h || options.help) {
    console.log(help(tree, pkg))
  } else if (options.v || options.version) {
    console.log(pkg.version)
  } else {
    console.log(`  ${greeting.join('\n  ')}`)
    console.log(help(tree, pkg))
  }
  return Promise.resolve()
}
