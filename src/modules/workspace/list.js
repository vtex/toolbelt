import chalk from 'chalk'
import moment from 'moment'
import Table from 'cli-table'
import log from '../../logger'
import {client} from './utils'
import {getWorkspace, getAccount} from '../../conf'

export default {
  description: 'List workspaces on this account',
  handler: () => {
    log.debug('Listing workspaces')
    const currentWorkspace = getWorkspace()
    return client().list(getAccount()).then(res => {
      const table = new Table({
        head: ['Name', 'Last Modified', 'State'],
      })
      res.forEach(r => {
        const name = r.name === currentWorkspace
          ? chalk.green(`* ${r.name}`)
          : r.name
        table.push([
          name,
          moment(r.lastModified).calendar(),
          r.state,
        ])
      })
      console.log(table.toString())
    })
  },
}
