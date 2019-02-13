import * as opn from 'opn'
import * as conf from '../../conf'

const buildPrefix = (account: string, workspace: string): string => {
  const base = 'https://'
  const workspacePrefix = workspace === 'master' ? '' : `${workspace}--`
  return base + workspacePrefix + account
}

const buildDomain = (region: conf.Environment): string =>
  region === conf.Environment.Production
    ? '.myvtex.com'
    : '.myvtexdev.com'

export default () => {
  const region = conf.getEnvironment()
  const { account, workspace } = conf.currentContext
  const prefix = buildPrefix(account, workspace)
  const domain = buildDomain(region)
  const path = '/admin'
  const uri = prefix + domain + path

  opn(uri, { wait: false })
}
