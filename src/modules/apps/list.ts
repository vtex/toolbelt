import chalk from 'chalk'
import { compose, equals, filter, head, prop, split } from 'ramda'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { SessionManager } from '../../api/session/SessionManager'
import { parseLocator } from '../../api/locator'
import log from '../../api/logger'
import { createTable } from '../../api/table'

const { listApps } = createAppsClient()

const cleanVersion = compose<string, string[], string>(head, split('+build'))

const filterBySource = (source: string) => filter(compose<any, string, boolean>(equals(source), prop('_source')))

const renderTable = ({
  title,
  emptyMessage,
  appArray,
}: {
  title: string
  emptyMessage: string
  appArray: any
}): void => {
  console.log(title)

  if (appArray.length === 0) {
    return console.log(`${emptyMessage}\n`)
  }

  const table = createTable()

  appArray.forEach(({ app }) => {
    const { vendor, name, version } = parseLocator(app)

    const cleanedVersion = cleanVersion(version)

    const formattedName = `${chalk.blue(vendor)}${chalk.gray.bold('.')}${name}`

    table.push([formattedName, cleanedVersion])
  })

  console.log(`${table.toString()}\n`)
}

export default async () => {
  const { account, workspace } = SessionManager.getSingleton()
  log.debug('Starting to list apps')
  const appArray = await listApps().then(prop('data'))
  renderTable({
    // Apps inherited by account's edition
    title: `${chalk.yellow('Edition Apps')} in ${chalk.blue(account)} at workspace ${chalk.yellow(workspace)}`,
    emptyMessage: 'You have no edition apps',
    appArray: filterBySource('edition')(appArray),
  })
  renderTable({
    // Installed apps
    title: `${chalk.yellow('Installed Apps')} in ${chalk.blue(account)} at workspace ${chalk.yellow(workspace)}`,
    emptyMessage: 'You have no installed apps',
    appArray: filterBySource('installation')(appArray),
  })
  renderTable({
    // Linked apps
    title: `${chalk.yellow('Linked Apps')} in ${chalk.blue(account)} at workspace ${chalk.yellow(workspace)}`,
    emptyMessage: 'You have no linked apps',
    appArray: filterBySource('link')(appArray),
  })
}
