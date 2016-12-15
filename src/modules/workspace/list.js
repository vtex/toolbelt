import chalk from 'chalk'
import Table from 'cli-table'
import log from '../../logger'
import {workspaces} from '../../clients'
import {getWorkspace, getAccount} from '../../conf'

export default {
  description: 'List workspaces on this account',
  handler: async () => {
    log.debug('Listing workspaces')
    const currentWorkspace = getWorkspace()
    const res = await workspaces().list(getAccount())
    const table = new Table({
      head: ['Name', 'Last Modified', 'State'],
    })
    res.forEach(r => {
      const name = r.name === currentWorkspace
        ? chalk.green(`* ${r.name}`)
        : r.name
      table.push([
        name,
        '?',
        '?',
      ])
    })
    console.log(table.toString())
  },
}
