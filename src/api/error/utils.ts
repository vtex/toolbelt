import { ErrorReport } from './ErrorReport'
import { ErrorKinds } from './ErrorKinds'

/** Create and register on telemetry an ErrorReport with errorKind = ErrorKinds.FLOW_ISSUE_ERROR */
export const createFlowIssueError = (msg: string): ErrorReport => {
  return ErrorReport.createAndMaybeRegisterOnTelemetry({
    kind: ErrorKinds.FLOW_ISSUE_ERROR,
    originalError: new Error(msg),
  })
}
