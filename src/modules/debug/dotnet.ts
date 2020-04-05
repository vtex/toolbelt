import { DotNetDebugger } from '../../lib/debuggers/DotNetDebugger'
import { ManifestEditor } from '../../lib/manifest'
import logger from '../../logger'

export default async (debugInst: string) => {
  const manifest = await ManifestEditor.getManifestEditor()
  const { builders } = manifest
  if (!builders?.dotnet) {
    logger.error('This command can only be used for dotnet apps')
    return
  }

  const dotNetDebugger = DotNetDebugger.create(manifest, debugInst)
  await dotNetDebugger.start()
}
