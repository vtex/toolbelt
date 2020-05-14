import { getManifest } from '../../../manifest'
import userAgent from '../../../user-agent'
import log from '../../../logger'
import { AuthType } from '@vtex/api'
import { SessionManager } from '../../../lib/session/SessionManager'
import { randomBytes } from 'crypto'
import { AppLogsEventSource } from './AppLogsEventSource'

export default async (app: string, options) => {
  const session = SessionManager.getSingleton()
  const { account, workspace, token, userLogged } = session

  const conf = {
    headers: {
      Authorization: `${AuthType.bearer} ${token}`,
      'user-agent': `${userAgent}${options.past ? `#${randomBytes(8).toString('hex')}` : `#${userLogged}`}`,
    },
  }

  try {
    const manifest = await getManifest()
    app = app || manifest.name
  } catch (err) {
    // manifest file was not found

    if (!account) {
      log.error('vendor could not be specified, are you logged in?')
      throw err
    }

    if (!options.all && !app) {
      log.error('app could not be specified. Did you forget --all?')
      throw err
    }
  }

  if (options.all) {
    app = ''
  }

  const appLogsEventSource = new AppLogsEventSource(account, workspace, app, conf)
  appLogsEventSource.createLogEventSource()

  log.info('Press CTRL+C to abort')
}
