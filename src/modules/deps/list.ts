import log from '../../logger'
import { apps } from '../../clients'
import { removeNpm } from './utils'

const { getDependencies } = apps

export default async ({ n, npm, k, keys }) => {
  log.debug('Starting to list dependencies')
  const deps = await getDependencies()
  const keysOnly = k || keys
  if (!(n || npm)) {
    removeNpm(deps, !keysOnly)
  }
  const result = keysOnly ? Object.keys(deps) : deps
  console.log(JSON.stringify(result, null, 2))
}
