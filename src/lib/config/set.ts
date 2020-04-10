import { contains, values } from 'ramda'

import { CommandError } from '../../utils/errors'
import log from '../../utils/logger'
import { Environment, saveCluster, saveEnvironment } from '../../utils/conf'

const envValues = values(Environment)

export function configSet(name: string, value: string) {
  switch (name) {
    case 'env':
      if (!contains(value, envValues)) {
        throw new CommandError(`Invalid value for environment "${value}". Possible values are: ${envValues.join(', ')}`)
      }
      saveEnvironment(value as Environment)
      log.info(`Successfully set environment to "${value}"`)
      break
    case 'cluster':
      saveCluster(value)
      log.info(`Successfully set cluster to "${value}"`)
      break
  }
}
