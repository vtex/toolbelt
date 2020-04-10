import { apps } from '../../../clients'
import log from '../../../utils/logger'

const { getDependencies } = apps

export async function workspaceDepsList(keysOnly) {
  log.debug('Starting to list dependencies')
  const deps = await getDependencies()
  const result = keysOnly ? Object.keys(deps) : deps
  console.log(JSON.stringify(result, null, 2))
}
