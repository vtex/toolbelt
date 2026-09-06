jest.mock('../../../api/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))
jest.mock('enquirer', () => ({
  __esModule: true,
  default: { prompt: jest.fn() },
}))
jest.mock('../../../api/modules/prompts')
jest.mock('../../../modules/init/git')
jest.mock('../../../api/modules/featureFlag')
jest.mock('../../../api/session/SessionManager', () => ({
  __esModule: true,
  SessionManager: { getSingleton: jest.fn() },
}))

import { FeatureFlag } from '../../../api/modules/featureFlag'
import { SessionManager } from '../../../api/session/SessionManager'

const TEMPLATES = {
  'service-example': { repository: 'service-example', organization: 'vtex-apps' },
  'react-example': { repository: 'react-example', organization: 'vtex-apps' },
  'internal-example': { repository: 'internal-example', organization: 'vtex-apps' },
}
const INTERNAL_TEMPLATES = ['internal-example']

const getFeatureFlagInfoMock = jest.fn((flagName: string) => {
  if (flagName === 'templates') return TEMPLATES
  if (flagName === 'VTEXInternalTemplates') return INTERNAL_TEMPLATES
  return undefined
})
;(FeatureFlag.getSingleton as jest.Mock).mockReturnValue({ getFeatureFlagInfo: getFeatureFlagInfoMock })

// `modules/init` reads the feature flags above at import time, so the mock must be
// configured before this import runs.
import appsInit from '../../../modules/init'
import log from '../../../api/logger'
import enquirer from 'enquirer'
import { promptConfirm } from '../../../api/modules/prompts'
import * as git from '../../../modules/init/git'

const setUser = (email: string) => {
  ;(SessionManager.getSingleton as jest.Mock).mockReturnValue({ userLogged: email })
}

describe('vtex init', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    getFeatureFlagInfoMock.mockImplementation((flagName: string) => {
      if (flagName === 'templates') return TEMPLATES
      if (flagName === 'VTEXInternalTemplates') return INTERNAL_TEMPLATES
      return undefined
    })
    ;(promptConfirm as jest.Mock).mockResolvedValue(true)
  })

  describe('--template', () => {
    test('valid access-filtered template name skips the prompt and clones directly', async () => {
      setUser('dev@vtex.com')

      await appsInit('myproj', { template: 'service-example', yes: true })

      expect(enquirer.prompt).not.toHaveBeenCalled()
      expect(git.clone).toHaveBeenCalledWith('service-example', 'vtex-apps', 'myproj')
    })

    test('unknown template name fails with an actionable error and does not clone', async () => {
      setUser('dev@vtex.com')

      await appsInit('myproj', { template: 'does-not-exist', yes: true })

      expect(git.clone).not.toHaveBeenCalled()
      expect(log.error).toHaveBeenCalledWith(expect.stringContaining('does-not-exist'))
    })

    test('internal-only template is rejected for a non-VTEX user like an unknown name', async () => {
      setUser('dev@example.com')

      await appsInit('myproj', { template: 'internal-example', yes: true })

      expect(git.clone).not.toHaveBeenCalled()
      const [[errorMessage]] = (log.error as jest.Mock).mock.calls
      expect(errorMessage).toEqual(expect.stringContaining('internal-example'))
    })
  })

  describe('--list', () => {
    test('prints the access-filtered template names and does not clone', async () => {
      setUser('dev@example.com')

      await appsInit(undefined, { list: true })

      expect(git.clone).not.toHaveBeenCalled()
      const infoMessages = (log.info as jest.Mock).mock.calls.map(([message]) => message)
      expect(infoMessages.some(message => message.includes('service-example'))).toBe(true)
      expect(infoMessages.some(message => message.includes('internal-example'))).toBe(false)
    })

    test('short-circuits even when combined with other flags and a project name', async () => {
      setUser('dev@vtex.com')

      await appsInit('myproj', { list: true, template: 'service-example', yes: true })

      expect(git.clone).not.toHaveBeenCalled()
      expect(promptConfirm).not.toHaveBeenCalled()
    })
  })

  describe('-y / --yes', () => {
    test('skips the overwrite confirmation prompt and clones directly', async () => {
      setUser('dev@vtex.com')

      await appsInit('myproj', { template: 'service-example', yes: true })

      expect(promptConfirm).not.toHaveBeenCalled()
      expect(git.clone).toHaveBeenCalled()
    })

    test('still prompts for confirmation when omitted', async () => {
      setUser('dev@vtex.com')

      await appsInit('myproj', { template: 'service-example' })

      expect(promptConfirm).toHaveBeenCalled()
      expect(git.clone).toHaveBeenCalled()
    })
  })
})
