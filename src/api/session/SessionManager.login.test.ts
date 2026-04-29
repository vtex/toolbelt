import jwt from 'jsonwebtoken'
import type { AuthProviderBase } from '../../lib/auth/AuthProviders'
import { SessionManager } from './SessionManager'
import type { SessionsPersisterBase } from './SessionsPersister'
import { VTEXID } from '../clients/IOClients/external/VTEXID'

jest.mock('../clients/IOClients/external/VTEXID', () => ({
  VTEXID: {
    createClient: jest.fn(),
    invalidateBrowserAuthCookie: jest.fn(),
  },
}))

jest.mock('../logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const createClientMock = VTEXID.createClient as jest.MockedFunction<typeof VTEXID.createClient>

function signJwt(expOffsetSeconds: number, sub = 'user@vtex.com') {
  return jwt.sign({ sub, exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }, 'test-secret')
}

function createPersister(overrides: Partial<Record<string, jest.Mock>> = {}): SessionsPersisterBase {
  const base = {
    clearData: jest.fn(),
    getAccount: jest.fn(() => ''),
    saveAccount: jest.fn(),
    getLastAccount: jest.fn(() => ''),
    saveLastAccount: jest.fn(),
    getWorkspace: jest.fn(() => 'master'),
    saveWorkspace: jest.fn(),
    getLastWorkspace: jest.fn(() => ''),
    saveLastWorkspace: jest.fn(),
    getToken: jest.fn(() => ''),
    saveToken: jest.fn(),
    getLogin: jest.fn(() => ''),
    saveLogin: jest.fn(),
    getAccountToken: jest.fn(() => ''),
    saveAccountToken: jest.fn(),
    getAccountRefreshToken: jest.fn(() => ''),
    saveAccountRefreshToken: jest.fn(),
  }
  return { ...base, ...overrides } as unknown as SessionsPersisterBase
}

const workspaceCreation = {
  promptCreation: false,
  creator: jest.fn(),
  onError: jest.fn(),
}

describe('SessionManager.login', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    createClientMock.mockReturnValue({
      refreshToken: jest.fn(),
      invalidateToolbeltToken: jest.fn().mockResolvedValue(undefined),
    } as any)
  })

  it('uses a valid cached account token and does not call refresh or OAuth', async () => {
    const cached = signJwt(3600)
    const persister = createPersister({
      getAccountToken: jest.fn(() => cached),
    })
    const oauthLogin = jest.fn()
    const sm = new SessionManager({
      sessionsPersister: persister,
      authProviders: { oauth: { login: oauthLogin } as AuthProviderBase },
    })

    await sm.login('acme', { workspaceCreation, useCachedToken: true, authMethod: 'oauth' })

    expect(oauthLogin).not.toHaveBeenCalled()
    expect(createClientMock).not.toHaveBeenCalled()
    expect(sm.token).toBe(cached)
  })

  it('refreshes when cached token is invalid but a refresh token exists', async () => {
    const expired = signJwt(-3600)
    const refreshedJwt = signJwt(7200)
    const persister = createPersister({
      getAccountToken: jest.fn(() => expired),
      getAccountRefreshToken: jest.fn(() => 'stored-refresh'),
    })
    const refreshToken = jest.fn().mockResolvedValue({ token: refreshedJwt, refreshToken: 'new-refresh' })
    createClientMock.mockReturnValue({
      refreshToken,
      invalidateToolbeltToken: jest.fn().mockResolvedValue(undefined),
    } as any)

    const oauthLogin = jest.fn()
    const sm = new SessionManager({
      sessionsPersister: persister,
      authProviders: { oauth: { login: oauthLogin } as AuthProviderBase },
    })

    await sm.login('acme', { workspaceCreation, useCachedToken: true, authMethod: 'oauth' })

    expect(createClientMock).toHaveBeenCalledWith({ account: 'acme' })
    expect(refreshToken).toHaveBeenCalledWith('stored-refresh')
    expect(oauthLogin).not.toHaveBeenCalled()
    expect(persister.saveAccountToken).toHaveBeenCalledWith('acme', refreshedJwt)
    expect(persister.saveAccountRefreshToken).toHaveBeenCalledWith('acme', 'new-refresh')
    expect(sm.token).toBe(refreshedJwt)
  })

  it('falls back to OAuth when refresh throws', async () => {
    const expired = signJwt(-3600)
    const oauthJwt = signJwt(3600)
    const persister = createPersister({
      getAccountToken: jest.fn(() => expired),
      getAccountRefreshToken: jest.fn(() => 'bad-refresh'),
    })
    const refreshToken = jest.fn().mockRejectedValue(new Error('refresh failed'))
    createClientMock.mockReturnValue({
      refreshToken,
      invalidateToolbeltToken: jest.fn().mockResolvedValue(undefined),
    } as any)

    const oauthLogin = jest.fn().mockResolvedValue({
      login: 'u@v.io',
      token: oauthJwt,
      refreshToken: 'from-oauth',
    })
    const sm = new SessionManager({
      sessionsPersister: persister,
      authProviders: { oauth: { login: oauthLogin } as AuthProviderBase },
    })

    await sm.login('acme', { workspaceCreation, useCachedToken: true, authMethod: 'oauth' })

    expect(refreshToken).toHaveBeenCalled()
    expect(oauthLogin).toHaveBeenCalledWith('acme', 'master')
    expect(persister.saveAccountToken).toHaveBeenCalledWith('acme', oauthJwt)
    expect(persister.saveAccountRefreshToken).toHaveBeenCalledWith('acme', 'from-oauth')
  })

  it('falls back to OAuth when there is no stored refresh token', async () => {
    const expired = signJwt(-3600)
    const oauthJwt = signJwt(3600)
    const persister = createPersister({
      getAccountToken: jest.fn(() => expired),
      getAccountRefreshToken: jest.fn(() => ''),
    })
    const oauthLogin = jest.fn().mockResolvedValue({
      login: 'u@v.io',
      token: oauthJwt,
      refreshToken: 'rt-oauth',
    })
    const sm = new SessionManager({
      sessionsPersister: persister,
      authProviders: { oauth: { login: oauthLogin } as AuthProviderBase },
    })

    await sm.login('acme', { workspaceCreation, useCachedToken: true, authMethod: 'oauth' })

    expect(createClientMock).not.toHaveBeenCalled()
    expect(oauthLogin).toHaveBeenCalledWith('acme', 'master')
    expect(persister.saveAccountRefreshToken).toHaveBeenCalledWith('acme', 'rt-oauth')
  })

  it('ignores a valid cache when useCachedToken is false and still refreshes if a refresh token exists', async () => {
    const cachedValid = signJwt(3600)
    const refreshedJwt = signJwt(7200)
    const persister = createPersister({
      getAccountToken: jest.fn(() => cachedValid),
      getAccountRefreshToken: jest.fn(() => 'rt'),
    })
    const refreshToken = jest.fn().mockResolvedValue({ token: refreshedJwt, refreshToken: 'rt2' })
    createClientMock.mockReturnValue({
      refreshToken,
      invalidateToolbeltToken: jest.fn().mockResolvedValue(undefined),
    } as any)

    const oauthLogin = jest.fn()
    const sm = new SessionManager({
      sessionsPersister: persister,
      authProviders: { oauth: { login: oauthLogin } as AuthProviderBase },
    })

    await sm.login('acme', { workspaceCreation, useCachedToken: false, authMethod: 'oauth' })

    expect(refreshToken).toHaveBeenCalledWith('rt')
    expect(oauthLogin).not.toHaveBeenCalled()
    expect(sm.token).toBe(refreshedJwt)
  })

  it('does not persist refresh token from OAuth when login omits refreshToken', async () => {
    const expired = signJwt(-3600)
    const oauthJwt = signJwt(3600)
    const persister = createPersister({
      getAccountToken: jest.fn(() => expired),
      getAccountRefreshToken: jest.fn(() => ''),
    })
    const oauthLogin = jest.fn().mockResolvedValue({
      login: 'u@v.io',
      token: oauthJwt,
    })
    const sm = new SessionManager({
      sessionsPersister: persister,
      authProviders: { oauth: { login: oauthLogin } as AuthProviderBase },
    })

    await sm.login('acme', { workspaceCreation, useCachedToken: true, authMethod: 'oauth' })

    expect(persister.saveAccountToken).toHaveBeenCalledWith('acme', oauthJwt)
    expect(persister.saveAccountRefreshToken).not.toHaveBeenCalled()
  })
})
