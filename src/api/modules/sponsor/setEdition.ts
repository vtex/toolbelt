import chalk from 'chalk'

import appsInstall from '../../../modules/apps/install'
import { createFlowIssueError } from '../../error/utils'
import { Sponsor } from '../../clients/IOClients/apps/Sponsor'
import { SessionManager } from '../../session/SessionManager'
import log from '../../logger'
import { promptWorkspaceMaster, sleepSec } from '../utils'
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

const confirmAndSwitchEnvironment = async (sponsorAccount: string, targetAccount: string, targetWorkspace: string) => {
  if (!sponsorAccount) {
    if (targetWorkspace !== 'master') {
      throw createFlowIssueError('Can only set initial edition in master workspace')
    }
    return promptSwitchToAccount('vtex', true)
  }

  const workspaceIsOk = targetWorkspace !== 'master' || (await promptWorkspaceMaster(targetAccount))
  if (!workspaceIsOk) return false
  return promptSwitchToAccount(sponsorAccount, false)
}

const tenantProvisionerApp = 'vtex.tenant-provisioner'

const promptInstallTenantProvisioner = async (account: string) => {
  log.warn(`Tenant provisioner app seems not to be installed in sponsor account ${chalk.blue(account)}.`)
  const proceed = await promptConfirm(
    `Do you want to install ${chalk.blue(tenantProvisionerApp)} in account ${chalk.blue(account)} now?`
  )
  if (!proceed) {
    return false
  }
  await appsInstall([tenantProvisionerApp], { force: false })
  return true
}

const isProvisionerNotInstalledError = (err: any) => {
  const res = err.response
  return res?.status === 404 && res.data?.source === 'Vtex.Kube.Router' && res.data?.code === 'NotFound'
}

const trySetEditionOnce = async (client: Sponsor, targetAccount: string, targetWorkspace: string, edition: string) => {
  try {
    await client.setEdition(targetAccount, targetWorkspace, edition)
    return true
  } catch (err) {
    if (!isProvisionerNotInstalledError(err)) {
      throw err
    }
    return false
  }
}

const maxSetEditionRetries = 3

const trySetEdition = async (
  sponsorAccount: string,
  targetAccount: string,
  targetWorkspace: string,
  edition: string
) => {
  const client = Sponsor.createClient()
  let success = await trySetEditionOnce(client, targetAccount, targetWorkspace, edition)
  if (success) {
    return true
  }

  const installed = await promptInstallTenantProvisioner(sponsorAccount)
  if (!installed) {
    return false
  }

  const workspaceNotice = targetWorkspace === 'master' ? '' : `in workspace ${chalk.blue(targetWorkspace)} `
  log.info(`Now setting edition ${chalk.blue(edition)} ${workspaceNotice}of account ${chalk.blue(targetAccount)}...`)

  // Retry a couple of times since it might take some time for the installation to propagate until the route is available.
  /* eslint-disable no-await-in-loop */
  for (let retry = 1; !success && retry <= maxSetEditionRetries; retry++) {
    await sleepSec(1.5 * retry)

    success =
      retry < maxSetEditionRetries
        ? await trySetEditionOnce(client, targetAccount, targetWorkspace, edition)
        : await client.setEdition(targetAccount, targetWorkspace, edition).then(() => true)
  }
  /* eslint-enable no-await-in-loop */
  return success
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

  const switched = await confirmAndSwitchEnvironment(sponsorAccount, targetAccount, targetWorkspace)
  if (!switched) {
    return
  }

  try {
    if (!(await trySetEdition(sponsorAccount, targetAccount, targetWorkspace, edition))) {
      return
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
