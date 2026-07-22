import { IOContext, InstanceOptions } from '@vtex/api'
import { VTEXID, RefreshFailedError } from './VTEXID'

function buildIoContext(account = 'testaccount'): IOContext {
  return {
    account,
    userAgent: 'toolbelt-jest',
    workspace: 'master',
    authToken: '',
    region: 'aws-us-east-1',
    production: false,
    product: '',
    route: { id: '', params: {} },
    requestId: '',
    operationId: '',
    platform: '',
    logger: ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      sendLog: jest.fn(),
    } as unknown) as IOContext['logger'],
  }
}

function buildClient() {
  return new VTEXID(buildIoContext(), {} as InstanceOptions)
}

function mockPostRaw(client: VTEXID, impl: jest.Mock) {
  ;((client as unknown) as { http: { postRaw: jest.Mock } }).http.postRaw = impl
}

function successBody() {
  return { status: 'Success' as const, userId: null, refreshAfter: null }
}

describe('VTEXID.refreshToken', () => {
  let client: VTEXID
  let postRaw: jest.Mock

  beforeEach(() => {
    client = buildClient()
    postRaw = jest.fn()
    mockPostRaw(client, postRaw)
  })

  it('returns token and refreshToken when status is Success and both cookies are present', async () => {
    const jwt = 'auth.jwt.here'
    const rt = 'new-refresh-token'
    postRaw.mockResolvedValue({
      data: successBody(),
      status: 200,
      headers: {
        'set-cookie': [
          `VtexIdclientAutCookie=${jwt}; Path=/; HttpOnly`,
          `vid_rt=${encodeURIComponent(rt)}; Path=/; HttpOnly`,
        ],
      },
    } as any)

    await expect(client.refreshToken('old-refresh')).resolves.toEqual({
      token: jwt,
      refreshToken: rt,
    })
  })

  it('throws RefreshFailedError when status is Success but only auth cookie exists', async () => {
    postRaw.mockResolvedValue({
      data: successBody(),
      status: 200,
      headers: {
        'set-cookie': [`VtexIdclientAutCookie=only-auth; Path=/`],
      },
    } as any)

    await expect(client.refreshToken('rt')).rejects.toThrow(/did not include both VtexIdclientAutCookie and vid_rt/)
  })

  it('throws RefreshFailedError when status is Success but only vid_rt cookie exists', async () => {
    postRaw.mockResolvedValue({
      data: successBody(),
      status: 200,
      headers: {
        'set-cookie': [`vid_rt=only-refresh; Path=/`],
      },
    } as any)

    await expect(client.refreshToken('rt')).rejects.toThrow(RefreshFailedError)
  })

  it('throws RefreshFailedError when status is Success but Set-Cookie is missing', async () => {
    postRaw.mockResolvedValue({
      data: successBody(),
      status: 200,
      headers: {},
    } as any)

    await expect(client.refreshToken('rt')).rejects.toThrow(RefreshFailedError)
  })

  it('throws RefreshFailedError when body status is InvalidSession', async () => {
    postRaw.mockResolvedValue({
      data: { status: 'InvalidSession', userId: null, refreshAfter: null },
      status: 200,
      headers: {
        'set-cookie': ['VtexIdclientAutCookie=auth; Path=/', 'vid_rt=refresh; Path=/'],
      },
    } as any)

    await expect(client.refreshToken('rt')).rejects.toThrow('Failed to refresh: status InvalidSession')
  })

  it('throws RefreshFailedError when body status is another non-Success value', async () => {
    postRaw.mockResolvedValue({
      data: { status: 'Expired', userId: null, refreshAfter: null },
      status: 200,
      headers: {},
    } as any)

    await expect(client.refreshToken('rt')).rejects.toThrow('Failed to refresh: status Expired')
  })

  it('rejects with the underlying error when postRaw fails with 4xx', async () => {
    const err = Object.assign(new Error('Unauthorized'), { response: { status: 401 } })
    postRaw.mockRejectedValue(err)

    await expect(client.refreshToken('rt')).rejects.toBe(err)
  })

  it('rejects with the underlying error when postRaw fails with 5xx', async () => {
    const err = Object.assign(new Error('Bad Gateway'), { response: { status: 502 } })
    postRaw.mockRejectedValue(err)

    await expect(client.refreshToken('rt')).rejects.toBe(err)
  })
})
