import { AppsListItem, removeBuild } from '@vtex/api'
import chalk from 'chalk'
import { EditionInfo, Sponsor } from '../../api/clients/IOClients/apps/Sponsor'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { ErrorKinds } from '../../api/error/ErrorKinds'
import { ErrorReport } from '../../api/error/ErrorReport'
import { SessionManager } from '../../api/session/SessionManager'
import { parseLocator } from '../../api/locator'
import log from '../../api/logger'
import { createTable } from '../../api/table'

const filterBySource = (method: 'edition' | 'installation') => {
  return (el: any) => el?._source === method
}

const renderTable = (title: string, rows: string[][]): void => {
  console.log(title)

  const table = createTable()

  rows.forEach(([name, value]) => {
    if (value) {
      table.push([chalk.blue(name), value])
    }
  })

  console.log(`${table.toString()}\n`)
}

const renderAppsTable = ({
  title,
  emptyMessage,
  appArray,
}: {
  title: string
  emptyMessage: string
  appArray: AppsListItem[]
}): void => {
  console.log(title)

  if (appArray.length === 0) {
    return console.log(`${emptyMessage}\n`)
  }

  const table = createTable()

  appArray.forEach(({ app }) => {
    const { vendor, name, version } = parseLocator(app)

    const cleanedVersion = removeBuild(version)

    const formattedName = `${chalk.blue(vendor)}${chalk.gray.bold('.')}${name}`

    table.push([formattedName, cleanedVersion])
  })

  console.log(`${table.toString()}\n`)
}

interface EditionStatus {
  isEditionSet: boolean | null
  edition: EditionInfo | null
}

const getEditionStatus = async (): Promise<EditionStatus> => {
  const sponsorClient = Sponsor.createClient()
  let isEditionSet: boolean | null = null
  let edition: EditionInfo | null
  try {
    edition = await sponsorClient.getEdition()
    isEditionSet = true
  } catch (err) {
    if (err.response?.data?.code === 'resource_not_found') {
      isEditionSet = false
    } else {
      ErrorReport.createAndMaybeRegisterOnTelemetry({
        kind: ErrorKinds.EDITION_REQUEST_ERROR,
        originalError: err,
      }).logErrorForUser({ coreLogLevelDefault: 'debug' })
    }

    edition = null
  }

  return {
    isEditionSet,
    edition,
  }
}

const createEditionInfoRows = ({ edition, isEditionSet }: EditionStatus) => {
  if (isEditionSet === false) {
    return [['Edition', 'not set']]
  }

  if (edition == null) {
    return []
  }

  return [
    ['Edition', edition.title],
    ['Edition id', edition.id],
    ['Edition activated', edition._activationDate],
  ]
}

export default async () => {
  const sessionManager = SessionManager.getSingleton()
  const { account, workspace } = sessionManager

  const apps = createAppsClient()
  const editionStatus = await getEditionStatus()

  let appArray: AppsListItem[] | null
  try {
    const { data } = await apps.listApps()
    appArray = data
  } catch (err) {
    ErrorReport.createAndMaybeRegisterOnTelemetry({
      originalError: err,
    }).logErrorForUser({ coreLogLevelDefault: 'debug' })

    appArray = null
  }

  log.info(`Welcome to VTEX IO!`)

  /** General information */
  renderTable(`${chalk.yellow('General')}`, [
    ['Account', account],
    ['Workspace', workspace],
    ...createEditionInfoRows(editionStatus),
  ])

  /** RUNNING TESTS */
  // We could add here the ab tests running

  /** LATEST WORKSPACES */
  // We could add here the lastest workspaces used on this account

  /** APPS LIST */
  if (appArray != null) {
    renderAppsTable({
      title: `${chalk.yellow('Installed Apps')}`,
      emptyMessage: 'You have no installed apps',
      appArray: appArray.filter(filterBySource('installation')),
    })
  }
}
