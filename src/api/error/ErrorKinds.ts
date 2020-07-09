import { ErrorKindsBase } from '@vtex/node-error-report'

export const ErrorKinds = {
  ...ErrorKindsBase,
  DEPRECATION_CHECK_ERROR: 'DeprecationCheckError',
  EDITION_REQUEST_ERROR: 'EditionRequestError',
  INVALID_OR_EXPIRED_TOKEN_ERROR: 'InvalidOrExpiredTokenError',
  OUTDATED_CHECK_ERROR: 'OutdatedCheckError',
  SETUP_TOOLING_ERROR: 'SetupToolingError',
  SETUP_TSCONFIG_ERROR: 'SetupTSConfigError',
  SETUP_TYPINGS_ERROR: 'SetupTypingsError',
  SSE_ERROR: 'SSEError',
  TELEMETRY_REPORTER_ERROR: 'TelemetryReporterError',
  TOOLBELT_CONFIG_MESSAGES_ERROR: 'ToolbeltConfigMessagesError',
  APP_LOGS_SSE_ERROR: 'LogsSSEError',
  APP_LOGS_PARSE_ERROR: 'LogsParseError',
  STICKY_HOST_ERROR: 'StickyHostError',
}
