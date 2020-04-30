import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import { NodeToRender } from '@vtex/toolbelt-message-renderer'
import { region } from '../env'
import { createIOContext, mergeCustomOptionsWithDefault } from '../lib/clients'
import { SessionManager } from '../lib/session/SessionManager'

interface VersionCheckRes {
  minVersion: string
  validVersion: boolean
  message: string
}

interface GlobalConfig {
  config: Record<string, any>
  messages: Record<string, NodeToRender>
}

export class ToolbeltConfigClient extends IOClient {
  public static readonly DEFAULT_TIMEOUT = 30000

  private static readonly PUBLIC_PATH_PREFIX = '/_v/public/toolbelt'
  private static readonly GLOBAL_CONFIG_PATH = `${ToolbeltConfigClient.PUBLIC_PATH_PREFIX}/global-config`
  private static readonly VERSION_VALIDATE_PATH = `${ToolbeltConfigClient.PUBLIC_PATH_PREFIX}/version-validate`

  public static create(ctx: IOContext, customOptions: InstanceOptions = {}) {
    return new ToolbeltConfigClient(ctx, mergeCustomOptionsWithDefault(customOptions))
  }

  public static createDefaultClient(customOptions: InstanceOptions = {}) {
    const { account, workspace, token } = SessionManager.getSingleton()
    return ToolbeltConfigClient.create(createIOContext({ account, workspace, authToken: token, region: region() }), {
      timeout: ToolbeltConfigClient.DEFAULT_TIMEOUT,
      ...customOptions,
    })
  }

  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, { ...options, baseURL: 'https://master--vtex.myvtex.com' })
  }

  public versionValidate(toolbeltVersion: string) {
    return this.http.post<VersionCheckRes>(ToolbeltConfigClient.VERSION_VALIDATE_PATH, { toolbeltVersion })
  }

  public getGlobalConfig() {
    return this.http.get<GlobalConfig>(ToolbeltConfigClient.GLOBAL_CONFIG_PATH)
  }
}
