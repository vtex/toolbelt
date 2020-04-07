export const enum TelemetryMetaMetrics {
  START_TIME = 'telemetry:startTime',
  REPORT_TIME = 'telemetry:reportTime',
  PENDING_DATA_FILES = 'telemetry:pendingData:files',
  PENDING_DATA_DIR_SIZE = 'telemetry:pendingData:dirSize',
  PENDING_DATA_MAX_FILE_SIZE = 'telemetry:pendingData:maxFileSize',
  PENDING_DATA_ACQUIRE_LOCK_TIME = 'telemetry:pendingData:acquireLockTime',
}

export const enum MetricNames {
  START_TIME = 'startTime',
  COMMAND_LATENCY = 'commandLatency',
}
