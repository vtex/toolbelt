import * as chalk from 'chalk'
import * as inquirer from 'inquirer'
import * as Bluebird from 'bluebird'
import {prop, head, tail, prepend} from 'ramda'

import log from '../../logger'
import {workspaces} from '../../clients'
import {getWorkspace, getAccount} from '../../conf'
import {parseArgs} from '../apps/utils'

const account = getAccount()
const workspace = getWorkspace()
const delSuccessList = []
const delFailList = []

const promptWorkspaceDeletion = (name: string): Bluebird<boolean> =>
  Promise.resolve(
    inquirer.prompt({
      type: 'confirm',
      name: 'confirm',
      message: `Are you sure you want to delete workspace ${chalk.green(name)}?`,
    }),
  )
    .then<boolean>(prop('confirm'))

const deleteWorkspaces = async (names = [], preConfirm: boolean, force: boolean): Promise<void | never> => {
  const name = head(names)
  const decNames = tail(names)

  log.debug('Starting to delete workspace', name)
  if (!force && name === workspace) {
    delFailList.push(name)
    log.error(`You are currently using the workspace ${chalk.green(name)}, please change your workspace before deleting`)
  } else {
    await Promise.resolve(preConfirm || promptWorkspaceDeletion(name))
    .then<boolean>(confirm => confirm || Promise.reject(new Error('User cancelled')))
    .then(() => workspaces.delete(account, name))
    .tap(() => {
      delSuccessList.push(name)
      log.info(`Workspace ${chalk.green(name)} deleted ${chalk.green(`successfully`)}`)
    })
    .catch(err => {
      delFailList.push(name)
      log.warn(`Workspace ${chalk.green(name)} was ${chalk.red(`not`)} deleted`)
      if (err.message === 'User cancelled') {
        log.error(err.message)
      } else {
        log.error(`Error ${err.response.status}: ${err.response.statusText}. ${err.response.data.message}`)
      }
    })
  }

  if (decNames.length > 0) {
    return deleteWorkspaces(decNames, preConfirm, force)
  } else {
    if (delSuccessList.length > 0) {
      log.info(`The following workspace` + (delSuccessList.length > 1 ? 's were' : ' was') + ` ${chalk.green('successfully')} deleted: ${delSuccessList.join(', ')}`)
    }
    if (delFailList.length > 0) {
      log.info(`The following workspace` + (delFailList.length > 1 ? 's were' : ' was') + ` ${chalk.red('not')} deleted: ${delFailList.join(', ')}`)
    }
    return Promise.resolve()
  }
}

export default (name: string, options) => {
  const names = prepend(name, parseArgs(options._))
  const preConfirm = options.y || options.yes
  const force = options.f || options.force
  log.debug('Deleting workspace' + (names.length > 1 ? 's' : '') + ':', names.join(', '))
  return deleteWorkspaces(names, preConfirm, force)
    .catch(err => {
      return Promise.reject(err)
    })
}
