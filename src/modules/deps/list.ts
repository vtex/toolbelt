import log from '../../logger'
import {apps} from '../../clients'

const {getDependencies} = apps
const isNpm = dep => dep.startsWith('npm:')
const removeNpm = (deps, inValues) => {
  Object.keys(deps).forEach(key => {
    if (isNpm(key)) {
      return delete deps[key]
    }
    if (inValues) {
      deps[key] = deps[key].filter(d => !isNpm(d))
    }
  })
}

export default {
  description: 'List your workspace dependencies',
  options: [
    {
      short: 'a',
      long: 'apps',
      description: 'Show only VTEX apps',
      type: 'boolean',
    },
    {
      short: 'k',
      long: 'keys',
      description: 'Show only keys',
      type: 'boolean',
    },
  ],
  handler: async ({a, apps, k, keys}) => {
    log.debug('Starting to list dependencies')
    const deps = await getDependencies()
    const keysOnly = k || keys
    if (a || apps) {
      removeNpm(deps, !keysOnly)
    }
    const result = keysOnly ? Object.keys(deps) : deps
    console.log(JSON.stringify(result, null, 2))
  },
}
