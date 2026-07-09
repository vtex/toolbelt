// bin/run has import-time side effects (and uses `node:module`, which the
// jest resolver can't handle) — mock it before importing the hook.
jest.mock('../../../bin/run', () => ({ initTimeStartTime: [0, 0] }))

import { checkLogin } from './init'
import authLogin from '../../modules/auth/login'

const mockCheckValidCredentials = jest.fn()

jest.mock('../../api/session/SessionManager', () => ({
  SessionManager: {
    getSingleton: () => ({ checkValidCredentials: mockCheckValidCredentials }),
  },
}))

jest.mock('../../modules/auth/login', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

const mockedAuthLogin = authLogin as jest.MockedFunction<typeof authLogin>

beforeEach(() => {
  jest.clearAllMocks()
  mockCheckValidCredentials.mockReturnValue(false)
})

describe('checkLogin', () => {
  it('does not trigger login for `vtex help`', async () => {
    await checkLogin('help', [])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })

  it('does not trigger login for `vtex help <command>`', async () => {
    await checkLogin('help', ['deploy'])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })

  it('does not trigger login for `vtex <command> --help`', async () => {
    await checkLogin('deploy', ['--help'])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })

  it('does not trigger login for `vtex <command> -h`', async () => {
    await checkLogin('deploy', ['-h'])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })

  it('does not trigger login for bare `vtex --help` / `vtex -h`', async () => {
    await checkLogin('--help', [])
    await checkLogin('-h', [])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })

  it('triggers login for a non-help, non-allowed command without credentials', async () => {
    await checkLogin('deploy', [])
    expect(mockedAuthLogin).toHaveBeenCalledTimes(1)
  })

  it('does not trigger login for `vtex <command> -- --help` when logged in', async () => {
    mockCheckValidCredentials.mockReturnValue(true)
    await checkLogin('deploy', ['--', '--help'])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })

  it('treats `vtex <command> -- --help` as a normal command (login required)', async () => {
    await checkLogin('deploy', ['--', '--help'])
    expect(mockedAuthLogin).toHaveBeenCalledTimes(1)
  })

  it('does not trigger login for allowed commands', async () => {
    await checkLogin('login', [])
    expect(mockedAuthLogin).not.toHaveBeenCalled()
  })
})
