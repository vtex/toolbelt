import { ToolbeltConfigClient } from '../../clients/toolbeltConfigClient'
import { MessagesStore } from './MessagesStore'
import { CacheUpdater } from '../../CLIPreTasks/LocalCacheUpdater/LocalCacheUpdater'

const CACHE_UPDATE_INTERVAL = 1 * 3600 * 1000

function shouldUpdateCache(lastUpdate: number) {
  return Date.now() - lastUpdate >= CACHE_UPDATE_INTERVAL
}

async function updateCache() {
  const client = ToolbeltConfigClient.createDefaultClient({ retries: 3 })
  const { messages } = await client.getGlobalConfig()
  const store = MessagesStore.getSingleton()
  store.setMessages(messages)
}

const cacheUpdater: CacheUpdater = {
  shouldUpdateCache,
  updateCache,
}

export default cacheUpdater
