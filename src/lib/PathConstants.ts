import envPaths from 'env-paths'
import { join } from 'path'

export class PathConstants {
  private static readonly VTEX_FOLDER = envPaths('vtex', { suffix: null }).config

  public static readonly PRETASKS_FOLDER = join(PathConstants.VTEX_FOLDER, 'pretasks')
  public static readonly TELEMETRY_FOLDER = join(PathConstants.VTEX_FOLDER, 'telemetry')
}
