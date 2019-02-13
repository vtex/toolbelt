import * as opn from 'opn'
import * as conf from '../../conf'

const chooseDomain = (region: conf.Environment): string =>
  region === conf.Environment.Production
    ? 'myvtex.com'
    : 'myvtexdev.com'

export default () => {
  const region = conf.getEnvironment()
  const { account, workspace } = conf.currentContext
  const uri = `https://${workspace}--${account}.${chooseDomain(region)}/admin`

  opn(uri, { wait: false })
}
