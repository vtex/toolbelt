import { SessionManager } from './session/SessionManager'
import { publicEndpoint } from './env'

/**
 * Create the store URL for a specific account + workspace + path
 * Examples:
 * 1) storeUrl({ account: 'vtex', workspace: 'master', path: '/admin' })
 * Will return 'https://master--vtex.myvtex.com/admin'
 *
 * 2) storeUrl({ account: 'vtex', addWorkspace: false })
 * Will return 'https://vtex.myvtex.com
 */
export function storeUrl(opts: StoreUrlOptions) {
  const session = SessionManager.getSingleton()
  const { account, workspace } = {
    account: opts.account ?? session.account,
    workspace: opts.workspace ?? session.workspace,
  }

  let path = '/'
  if (opts.path) {
    path = opts.path.startsWith('/') ? opts.path : `/${opts.path}`
  }

  if (opts.addWorkspace) {
    return `https://${workspace}--${account}.${publicEndpoint()}${path}`
  }

  return `https://${account}.${publicEndpoint()}${path}`
}

interface StoreUrlOptions {
  /**
   * The store account to be used to create the URL. If not specified, the account the user
   * is logged into will be used.
   */
  account?: string
  /**
   * The workspace to be used to create the URL. If not specified, the workspace the user
   * is using will be used.
   *
   * If the 'addWorkspace' option is false this will not be used
   */
  workspace?: string
  /**
   * Specifies whether the workspace should be added to the URL
   * @default true
   */
  addWorkspace?: boolean
  /**
   * The path to be added after the host
   * @default '''
   */
  path?: string
}
