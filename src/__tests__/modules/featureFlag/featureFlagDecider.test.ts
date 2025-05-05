import chalk from 'chalk'
import { switchOpen } from '../../../modules/featureFlag/featureFlagDecider'

jest.mock('open')
jest.mock('opn')
jest.mock('../../../api/clients/IOClients/apps/ToolbeltConfig')
jest.mock('../../../api/logger')
jest.mock('../../../api/error/ErrorReport')
import open from 'open'
import opn from 'opn'
import { GlobalConfig, ToolbeltConfig, VersionCheckRes } from '../../../api/clients/IOClients/apps/ToolbeltConfig'
import logger from '../../../api/logger'
import { IOClientFactory } from '../../../api/clients/IOClients/IOClientFactory'
import { ErrorReport, LogToUserOptions, CustomErrorReportBaseConstructorArgs } from '../../../api/error/ErrorReport'

const getGlobalConfigMock = jest.fn()
const logErrorForUserMock = jest.fn()

class ToolbeltConfigMock extends ToolbeltConfig {
  public async versionValidate(_: string) {
    return { minVersion: '', validVersion: true, message: '' } as VersionCheckRes
  }

  public async getGlobalConfig(): Promise<GlobalConfig> {
    return getGlobalConfigMock()
  }
}

class ErrorReportMock extends ErrorReport {
  public logErrorForUser(_?: LogToUserOptions) {
    logErrorForUserMock()
    return this
  }
}

describe('featureFlagDecider', () => {
  beforeAll(() => {
    const clientMock = new ToolbeltConfigMock(IOClientFactory.createIOContext(), {})
    jest.spyOn(ToolbeltConfig, 'createClient').mockReturnValue(clientMock)

    const errorMock = new ErrorReportMock({ shouldRemoteReport: false } as CustomErrorReportBaseConstructorArgs)
    jest.spyOn(ErrorReport, 'createAndMaybeRegisterOnTelemetry').mockReturnValue(errorMock)
  })

  beforeEach(() => {
    getGlobalConfigMock.mockClear()
    logErrorForUserMock.mockClear()
  })

  describe('switchOpen', () => {
    let url: string
    let options: object

    beforeAll(() => {
      url = 'https://vtex.myvtex.com'
      options = {}
    })

    test('should log properly', async () => {
      getGlobalConfigMock.mockReturnValue({
        featureFlags: {
          FEATURE_FLAG_NEW_OPEN_PACKAGE: true,
        },
      })

      await switchOpen(url, options)

      expect(getGlobalConfigMock).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledTimes(2)
      expect(logger.info).lastCalledWith(`${chalk.cyan(url)}`)
    })

    test('should use open when FEATURE_FLAG_NEW_OPEN_PACKAGE is true', async () => {
      getGlobalConfigMock.mockReturnValue({
        featureFlags: {
          FEATURE_FLAG_NEW_OPEN_PACKAGE: true,
        },
      })

      await switchOpen(url, options)

      expect(getGlobalConfigMock).toHaveBeenCalled()
      expect(open).toHaveBeenCalled()
    })

    test('should use opn when FEATURE_FLAG_NEW_OPEN_PACKAGE is false', async () => {
      getGlobalConfigMock.mockReturnValue({
        featureFlags: {
          FEATURE_FLAG_NEW_OPEN_PACKAGE: false,
        },
      })

      await switchOpen(url, options)

      expect(getGlobalConfigMock).toHaveBeenCalled()
      expect(opn).toHaveBeenCalled()
    })

    test('should show a debug log in case of errors', async () => {
      const errorMsg = 'fake error'
      getGlobalConfigMock.mockImplementation(() => {
        throw new Error(errorMsg)
      })

      await switchOpen(url, options)

      expect(getGlobalConfigMock).toHaveBeenCalled()
      expect(ErrorReport.createAndMaybeRegisterOnTelemetry).toHaveBeenCalled()
      expect(ErrorReport)
    })
  })
})
