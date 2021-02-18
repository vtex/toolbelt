import { Logger } from '@vtex/api/lib/service/logger'
import { SessionManager } from './session'

const { account, workspace } = SessionManager.getSingleton()

const noop = () => {}

export const dummyLogger = ({
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
