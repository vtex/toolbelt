import chalk from 'chalk'

import appsInstall from '../../../modules/apps/install'
import { createFlowIssueError } from '../../error/utils'
import { Sponsor } from '../../clients/IOClients/apps/Sponsor'
import { SessionManager } from '../../session/SessionManager'
import log from '../../logger'
import { promptWorkspaceMaster } from '../utils'
import { returnToPreviousAccount, switchAccount } from '../auth/switch'
import { promptConfirm } from '../prompts'

const promptSwitchToAccount = async (account: string, initial: boolean) => {
  const reason = initial
    ? `Initial edition can only be set by ${chalk.blue(account)} account`
    : `Only current account sponsor (${chalk.blue(account)}) can change its edition`
  const proceed = await promptConfirm(`${reason}. Do you want to switch to account ${chalk.blue(account)}?`)
  if (!proceed) {
    return false
  }
  await switchAccount(account, {})
  return true
}

const tenantProvisionerApp = 'vtex.tenant-provisioner'

const promptInstallTenantProvisioner = async (account: string) => {
  log.notice(`Tenant provisioner app seems not to be installed in sponsor account ${chalk.blue(account)}.`)
  const proceed = await promptConfirm(`Do you want to install ${chalk.blue(tenantProvisionerApp)} in account ${chalk.blue(account)} now?`)
  if (!proceed) {
    return false
  }
  await appsInstall([tenantProvisionerApp], { force: false })
  return true
}

export default async function setEdition(edition: string, workspace?: string, autoSwitchBack = false) {
  const session = SessionManager.getSingleton()
  const { account: previousAccount, workspace: previousWorkspace } = session

  const targetAccount = session.account
  const targetWorkspace = workspace ?? session.workspace

  const workspaceNotice = targetWorkspace === 'master' ? '' : ` in workspace ${chalk.blue(targetWorkspace)}`
  log.info(`Changing edition of account ${chalk.blue(targetAccount)}${workspaceNotice}.`)

  const sponsorClient = Sponsor.createClient()
  const sponsorAccount = await sponsorClient.getSponsorAccount()

  let switched = false
  if (!sponsorAccount) {
    if (targetWorkspace !== 'master') {
      throw createFlowIssueError('Can only set initial edition in master workspace')
    }
    switched = await promptSwitchToAccount('vtex', true)
  } else {
    if (targetWorkspace === 'master') {
      switched = await promptWorkspaceMaster(targetWorkspace)
    }
    switched = await promptSwitchToAccount(sponsorAccount, false)
  }
  if (!switched) {
    return
  }

  try {
    const sponsorClientForSponsorAccount = Sponsor.createClient()
    try {
      await sponsorClientForSponsorAccount.setEdition(targetAccount, targetWorkspace, edition)
    } catch (err) {
      if (err.response?.status !== 404) {
        throw err
      }
      const installed = await promptInstallTenantProvisioner(sponsorAccount)
      if (!installed) {
        throw err
      }
      await sponsorClientForSponsorAccount.setEdition(targetAccount, targetWorkspace, edition)
    }

    log.info(`Successfully changed edition${workspaceNotice} of account ${chalk.blue(targetAccount)}.`)
  } catch (err) {
    log.error(`Failed to change edition of account ${chalk.blue(targetAccount)}.`)
    throw err
  } finally {
    if (autoSwitchBack) {
      await returnToPreviousAccount({ previousAccount, previousWorkspace, promptConfirmation: false })
    } else {
      await returnToPreviousAccount({ previousAccount, previousWorkspace })
    }
  }
}
