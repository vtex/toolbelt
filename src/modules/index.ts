import { help } from 'findhelp'

import * as pkg from '../../package.json'
import { greeting } from '../greeting'
import tree from './tree'

export default async (options) => {
  if (options.h || options.help) {
    console.log(help(tree, pkg))
  } else if (options.v || options.version) {
    console.log(pkg.version)
  } else {
    const lines = await greeting()
    console.log(`  ${lines.join('\n  ')}`)
    console.log(help(tree, pkg))
  }
  return Promise.resolve()
}
