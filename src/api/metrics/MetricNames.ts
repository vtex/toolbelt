export const enum TelemetryMetaMetrics {
  PENDING_DATA_ACQUIRE_LOCK_TIME = 'telemetry:pendingData:acquireLockTime',
  PENDING_DATA_DIR_SIZE = 'telemetry:pendingData:dirSize',
  PENDING_DATA_FILES = 'telemetry:pendingData:files',
  PENDING_DATA_MAX_FILE_SIZE = 'telemetry:pendingData:maxFileSize',
  REPORT_TIME = 'telemetry:reportTime',
  START_TIME = 'telemetry:startTime',
}

export const enum MetricNames {
  CLI_PRE_TASKS_LATENCY = 'cliPreTasks:latency',
  COMMAND_LATENCY = 'commandLatency',
  START_TIME = 'startTime',
}
