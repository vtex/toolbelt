import { Runtime } from '../../clients/runtime'
import { getIOContext } from '../utils'
import { ManifestEditor } from '../../lib/manifest'
import logger from '../../logger'

export default async (debugInst: string) => {
  const manifest = await ManifestEditor.getManifestEditor()
  const { name, vendor, builders } = manifest
  const { dotnet } = builders
  if (!dotnet) {
    logger.error('This command can only be used for dotnet apps')
    return
  }

  const runtimeClient = new Runtime(getIOContext())
  await runtimeClient.debugDotnetApp(name, vendor, manifest.majorRange, debugInst)
}
