import { Runtime } from '../../clients/runtime'
import { createIOContext } from '../../lib/clients'
import { ManifestEditor } from '../../lib/manifest'
import logger from '../../logger'

export default async (debugInst: string) => {
  const manifest = await ManifestEditor.getManifestEditor()
  const { name, vendor, builders } = manifest
  if (!builders?.dotnet) {
    logger.error('This command can only be used for dotnet apps')
    return
  }

  const runtimeClient = new Runtime(createIOContext())
  await runtimeClient.debugDotnetApp(name, vendor, manifest.major, debugInst)
}
