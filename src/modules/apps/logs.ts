import { AppLogsEventSource } from '../../api/clients/eventSources/AppLogsEventSource'
import { ManifestEditor } from '../../api/manifest'
import log from '../../api/logger'

export default async (app: string, options) => {
  if (options.all) {
    app = ''
  } else if (await ManifestEditor.isManifestReadable()) {
    const manifest = await ManifestEditor.getManifestEditor()
    app = app || manifest.name
  } else if (!app) {
    log.error('App could not be specified. Did you forget --all?')
    return
  }

  const appLogsEventSource = AppLogsEventSource.createDefault({ app, showSeenLogs: options.past })
  appLogsEventSource.createLogEventSource()

  log.info('Press CTRL+C to abort')
}
