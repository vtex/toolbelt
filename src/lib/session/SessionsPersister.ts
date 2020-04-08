import Configstore from 'configstore'
import { name as pkgName } from '../../../package.json'

export abstract class SessionsPersisterBase {
  public abstract clearData(): void

  public abstract getAccount(): string

  public abstract saveAccount(account: string): void

  public abstract getWorkspace(): string

  public abstract saveWorkspace(workspace: string): void

  public abstract getToken(): string

  public abstract saveToken(token: string): void

  public abstract getLogin(): string

  public abstract saveLogin(login: string): void

  public abstract getAccountToken(account: string): string

  public abstract saveAccountToken(account: string, token: string)
}

export class SessionsPersister extends SessionsPersisterBase {
  public static getSessionsPersister() {
    return new SessionsPersister(new Configstore(pkgName))
  }

  constructor(private configstore: Configstore) {
    super()
  }

  public clearData() {
    this.configstore.clear()
  }

  public getAccount() {
    return this.configstore.get('account')
  }

  public saveAccount(account: string) {
    this.configstore.set('account', account)
  }

  public getWorkspace() {
    return this.configstore.get('workspace')
  }

  public saveWorkspace(workspace: string) {
    this.configstore.set('workspace', workspace)
  }

  public getToken() {
    return this.configstore.get('token')
  }

  public saveToken(token: string) {
    this.configstore.set('token', token)
  }

  public getLogin() {
    return this.configstore.get('login')
  }

  public saveLogin(login: string) {
    return this.configstore.set('login', login)
  }

  public getAccountToken(account: string) {
    const tokens = this.configstore.get('tokens') || {}
    return tokens[account]
  }

  public saveAccountToken(account: string, token: string) {
    this.configstore.set(`tokens.${account}`, token)
  }
}
