import { Logger } from '@vtex/api/lib/service/logger'
import { SessionManager } from '../lib/session/SessionManager'

const noop = () => {}

export function createDummyLogger() {
  const { account, workspace } = SessionManager.getSingleton()
  return ({
    account,
    workspace,
    operationId: '',
    requestId: '',
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    sendLog: noop,
  } as unknown) as Logger
}
