import { Runtime } from '../../lib/clients/IOClients/infra/Runtime'
import { ManifestEditor } from '../../lib/manifest'
import logger from '../../logger'

export default async (debugInst: string) => {
  const manifest = await ManifestEditor.getManifestEditor()
  const { name, vendor, builders } = manifest
  if (!builders?.dotnet) {
    logger.error('This command can only be used for dotnet apps')
    return
  }

  const runtimeClient = Runtime.createClient()
  await runtimeClient.debugDotnetApp(name, vendor, manifest.major, debugInst)
}
