import { apps } from '../../clients'
import log from '../../logger'

export default async ({ k, keys }) => {
  log.debug('Starting to list dependencies')
  const deps = await apps.getDependencies()
  const keysOnly = k || keys
  const result = keysOnly ? Object.keys(deps) : deps
  console.log(JSON.stringify(result, null, 2))
}
