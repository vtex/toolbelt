import { NpmClient } from '../clients/npmClient'
import logger from '../logger'
import { CLIPrecheckerStore, ICLIPrecheckerStore } from './CLIPrecheckerStore'

export const checkForDeprecate = async (store: ICLIPrecheckerStore, pkgName: string, pkgVersion: string) => {
  try {
    const { deprecated } = await NpmClient.getPackageMetadata(pkgName, pkgVersion)
    store.setDeprecated(deprecated != null)
    store.setLastDeprecationCheck(Date.now())
    process.exit()
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

if (require.main === module) {
  const store = new CLIPrecheckerStore(process.argv[2])
  checkForDeprecate(store, process.argv[3], process.argv[4])
}
