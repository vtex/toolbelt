import chalk from 'chalk'

import { ErrorKinds, ErrorReport } from '../../api/error'
import { saveEnvironment, saveCluster, ENV_DEFAULT_VALUE, CLUSTER_DEFAULT_VALUE } from '../../conf'

export default (name: string) => {
  switch (name) {
    case 'env':
      saveEnvironment(ENV_DEFAULT_VALUE)
      break
    case 'cluster':
      saveCluster(CLUSTER_DEFAULT_VALUE)
      break
    default:
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.FLOW_ISSUE_ERROR,
        originalError: new Error(`The supported configurations are: ${chalk.blue('env')}, ${chalk.blue('cluster')}`),
      })
  }
}
