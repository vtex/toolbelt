import { Logger } from '@vtex/api/lib/service/logger'
import { getAccount, getWorkspace } from '../conf'

const noop = () => {
  return
}

export const dummyLogger = {
  account: getAccount(),
  workspace: getWorkspace(),
  operationId: '',
  requestId: '',
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  sendLog: noop,
} as unknown as Logger
