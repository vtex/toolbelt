import { NodeToRender } from '@vtex/toolbelt-message-renderer'
import { pathExistsSync, readdirSync, readJsonSync, writeJsonSync } from 'fs-extra'
import { join } from 'path'
import { ToolbeltConfigClient } from '../../clients/toolbeltConfigClient'
import { ErrorKinds } from '../error/ErrorKinds'
import { ErrorReport } from '../error/ErrorReport'
import { PathConstants } from '../PathConstants'
import { TelemetryCollector } from '../telemetry/TelemetryCollector'

export interface IMessagesStore {
  storeDir: string
  getMessage: (messageName: string) => NodeToRender | Promise<NodeToRender>
  setMessages: (messages: Record<string, NodeToRender>) => void
}

export class MessagesStore implements IMessagesStore {
  private static MESSAGES_FOLDER = PathConstants.MESSAGES_CACHE_FOLDER
  private static singleton: MessagesStore

  public static getSingleton() {
    if (MessagesStore.singleton) {
      return MessagesStore.singleton
    }

    MessagesStore.singleton = new MessagesStore(MessagesStore.MESSAGES_FOLDER)
    return MessagesStore.singleton
  }

  public static hasLocalCache() {
    if (!pathExistsSync(MessagesStore.MESSAGES_FOLDER)) {
      return false
    }

    if (readdirSync(MessagesStore.MESSAGES_FOLDER).length === 0) {
      return false
    }

    return true
  }

  private messages: Record<string, NodeToRender>
  constructor(public readonly storeDir: string) {}

  public async getMessage(messageName: string) {
    if (this.messages[messageName]) {
      return this.messages[messageName]
    }

    try {
      this.messages[messageName] = readJsonSync(join(this.storeDir, messageName))
      return this.messages[messageName]
    } catch (err) {
      TelemetryCollector.getCollector().registerError(
        ErrorReport.create({
          kind: ErrorKinds.MESSAGES_LOCAL_CACHE_ERROR,
          originalError: err,
        })
      )
    }

    return this.getRemoteMessage(messageName)
  }

  public setMessages(messages: Record<string, NodeToRender>) {
    Object.keys(messages).forEach(messageName => {
      writeJsonSync(join(this.storeDir, messageName), messages[messageName])
    })
  }

  private async getRemoteMessage(messageName: string) {
    const client = ToolbeltConfigClient.createDefaultClient()
    const remoteConfig = await client.getGlobalConfig()
    return remoteConfig.messages[messageName]
  }
}
