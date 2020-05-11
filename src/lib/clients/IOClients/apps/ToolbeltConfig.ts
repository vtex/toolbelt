import { InstanceOptions, IOClient, IOContext } from '@vtex/api'
import { NodeToRender } from '@vtex/toolbelt-message-renderer'
import { IOClientFactory } from '../IOClientFactory'

interface VersionCheckRes {
  minVersion: string
  validVersion: boolean
  message: string
}

interface GlobalConfig {
  config: Record<string, any>
  messages: Record<string, NodeToRender>
}

export class ToolbeltConfig extends IOClient {
  public static readonly DEFAULT_TIMEOUT = 30000

  private static readonly PUBLIC_PATH_PREFIX = '/_v/public/toolbelt'
  private static readonly GLOBAL_CONFIG_PATH = `${ToolbeltConfig.PUBLIC_PATH_PREFIX}/global-config`
  private static readonly VERSION_VALIDATE_PATH = `${ToolbeltConfig.PUBLIC_PATH_PREFIX}/version-validate`

  public static createClient(customContext: Partial<IOContext> = {}, customOptions: Partial<InstanceOptions> = {}) {
    return IOClientFactory.createClient<ToolbeltConfig>(ToolbeltConfig, customContext, {
      timeout: ToolbeltConfig.DEFAULT_TIMEOUT,
      ...customOptions,
    })
  }

  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, { ...options, baseURL: 'https://master--vtex.myvtex.com' })
  }

  public versionValidate(toolbeltVersion: string) {
    return this.http.post<VersionCheckRes>(ToolbeltConfig.VERSION_VALIDATE_PATH, { toolbeltVersion })
  }

  public getGlobalConfig() {
    return this.http.get<GlobalConfig>(ToolbeltConfig.GLOBAL_CONFIG_PATH)
  }
}
