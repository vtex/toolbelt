import { Runtime } from '../../clients/runtime'
import logger from '../../utils/logger'
import { ManifestEditor } from '../../utils/manifest/ManifestEditor'
import { getIOContext } from '../../utils/utils'

export async function debugDotnet(debug) {
  const manifest = await ManifestEditor.getManifestEditor()
  const { name, vendor, builders } = manifest
  if (!builders?.dotnet) {
    logger.error('This command can only be used for dotnet apps')
    return
  }

  const runtimeClient = new Runtime(getIOContext())
  await runtimeClient.debugDotnetApp(name, vendor, manifest.majorRange, debug)
}
