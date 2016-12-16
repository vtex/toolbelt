import Table from 'cli-table'
import log from '../../logger'
import {appEngine} from '../../clients'
import {getAccount, getWorkspace} from '../../conf'

export default {
  description: 'List your installed VTEX apps',
  handler: () => {
    log.debug('Starting to list apps')
    return appEngine().listApps(
      getAccount(),
      getWorkspace()
    )
    .then(res => {
      if (res.data.length === 0) {
        return log.info('You have no installed apps')
      }
      const table = new Table({
        head: ['Vendor', 'Name', 'Version'],
      })
      res.data.forEach(r => {
        table.push([
          r.vendor,
          r.name,
          r.version,
        ])
      })
      console.log(table.toString())
    })
  },
}
