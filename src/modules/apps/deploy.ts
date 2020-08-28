import chalk from 'chalk'
import { createRegistryClient } from '../../api/clients/IOClients/infra/Registry'
import { parseLocator } from '../../api/locator'
import log from '../../api/logger'
import { ManifestEditor, ManifestValidator } from '../../api/manifest'
import { promptConfirm } from '../../api/modules/prompts'
import { SessionManager } from '../../api/session/SessionManager'
import { returnToPreviousAccount, switchAccount } from '../auth/switch'
import axios from 'axios'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'
import { prop} from 'ramda'

const switchToVendorMessage = (vendor: string): string => {
  return `You are trying to deploy this app in an account that differs from the indicated vendor. Do you want to deploy in account ${chalk.blue(
    vendor
  )}?`
}

const promptDeploy = (app: string) => promptConfirm(`Are you sure you want to deploy app ${app}`)

const deployRelease = async (app: string): Promise<boolean> => {
  const { vendor, name, version } = parseLocator(app)
  const session = SessionManager.getSingleton()
  if (vendor !== session.account) {
    const canSwitchToVendor = await promptConfirm(switchToVendorMessage(vendor))
    if (!canSwitchToVendor) {
      return false
    }
    await switchAccount(vendor, {})
  }
  const context = { account: vendor, workspace: 'master', authToken: session.token }
  const registry = createRegistryClient(context)
  await registry.validateApp(`${vendor}.${name}`, version)
  return true
}

const prepareDeploy = async (app, originalAccount, originalWorkspace: string): Promise<void> => {
  app = ManifestValidator.validateApp(app)
  try {
    log.debug('Starting to deploy app:', app)
    const deployed = await deployRelease(app)
    if (deployed) {
      log.info('Successfully deployed', app)
    }
  } catch (e) {
    const data = e.response?.data
    const code = data?.code
    if (code === 'app_is_not_rc') {
      log.error(`App ${app} was already deployed.`)
    } else if (data?.message) {
      log.error(data.message)
    } else {
      await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
      throw e
    }
  }

  await returnToPreviousAccount({ previousAccount: originalAccount, previousWorkspace: originalWorkspace })
}

const getMetrics = async(appID:string, originalAccount:string, workspace:string = "master") => {

  const http = axios.create({
    baseURL: `https://app.io.vtex.com`,
    timeout: 10000,
    headers: {Authorization: SessionManager.getSingleton().token} 
  })
  try {
    let res = await http.get(`/vtex.themis/v0/${originalAccount}/${workspace}/_v/private/judge/getMetrics/${appID}`)
    res = res.data
    return res
  } catch (e) {
    return {}
  }
}

const showMetrics = async(metrics: any) => {
  let clusters:any[] = Object.keys(metrics)
  let metrics_app:any = {}
  for(let i_cluster = 0; i_cluster < clusters.length; i_cluster++){
    let cluster = clusters[i_cluster]
    if(cluster == 'Classification'){
      metrics_app['Classification'] = metrics[cluster]
      continue
    }
    let metrics_names = Object.keys(metrics[cluster])
    metrics_app[cluster] = {}

    for(let i_metrics = 0; i_metrics < metrics_names.length; i_metrics++){
      let metric_name = metrics_names[i_metrics]
      if( Object.keys(metrics[cluster][metric_name].value).length == 0 ){
        continue
      }
      try{
        metrics_app[cluster][metric_name] = metrics[cluster][metric_name].value
      }catch{
        metrics_app[cluster][metric_name] = undefined
      }
    }
    if( Object.keys(metrics_app[cluster]).length == 0 ){
      delete metrics_app[cluster]
    }

  }
  log.info(metrics_app)
}

const displayMetrics = async(appID:string, originalAccount:string, workspace:string = "master") => {
  let metrics = await getMetrics(appID,originalAccount,workspace)
  showMetrics(metrics)
}

const isThemisInstalled = async () => {
  const { listApps } = createAppsClient()
  const appArray:any[] = await listApps().then(prop('data'))
  for(let i_app = 0; i_app < appArray.length; i_app++){
    let appName:string = appArray[i_app].app.split('@')[0]
    if(appName == 'vtex.themis'){
      return true
    }
    
  }
  return false
}

export default async (optionalApp: string, options) => {
  const preConfirm = options.y || options.yes
  const { account: originalAccount, workspace: originalWorkspace } = SessionManager.getSingleton()
  const app = optionalApp || (await ManifestEditor.getManifestEditor()).appLocator
  const hasThemis = await isThemisInstalled()

  if(hasThemis){
    await displayMetrics(app, originalAccount, originalWorkspace)
  }
  if (!preConfirm && !(await promptDeploy(app))) {
    return
  }
  log.debug(`Deploying app ${app}`)
  return prepareDeploy(app, originalAccount, originalWorkspace)
}
