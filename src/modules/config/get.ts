import chalk from 'chalk'

import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { getEnvironment, getCluster } from '../../conf'

export default (name: string) => {
  switch (name) {
    case 'env':
      console.log(getEnvironment() || '')
      break
    case 'cluster':
      console.log(getCluster())
      break
    default:
      throw ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.FLOW_ISSUE_ERROR,
        originalError: new Error(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`),
      })
  }
}
