import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import log from '../../api/logger'
import { removeNpm } from './utils'

const { getDependencies } = createAppsClient()

export default async (flags: { keys: boolean; npm: boolean }) => {
  log.debug('Starting to list dependencies')
  const deps = await getDependencies()
  const keysOnly = flags.keys
  if (!flags.npm) {
    removeNpm(deps, !keysOnly)
  }
  const result = keysOnly ? Object.keys(deps) : deps
  console.log(JSON.stringify(result, null, 2))
}
