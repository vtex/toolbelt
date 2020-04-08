import { homedir } from 'os'
import { join } from 'path'

export class PathConstants {
  private static readonly VTEX_FOLDER = join(homedir(), '.vtex')

  public static readonly PRETASKS_FOLDER = join(PathConstants.VTEX_FOLDER, 'pretasks')
  public static readonly TELEMETRY_FOLDER = join(PathConstants.VTEX_FOLDER, 'telemetry')
  public static readonly LOGS_FOLDER = join(PathConstants.VTEX_FOLDER, 'logs')
}
