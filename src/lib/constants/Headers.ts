export enum Headers {
  VTEX_ORIGINAL_CREDENTIAL = 'x-vtex-original-credential',

  // If set to 'true' in the request, will hit the runtime-base server, instead of the app server.
  VTEX_RUNTIME_API = 'x-vtex-runtime-api',

  // Specify a specific pod to receive the request
  VTEX_STICKY_HOST = 'x-vtex-sticky-host',

  // Specify the target cluster for the request.
  // Works only on myvtexdev domain
  VTEX_UPSTREAM_TARGET = 'x-vtex-upstream-target',

  // LinkID used by builder-hub to create logs/tracing correlation between all
  // relink/link operations related to a initial link
  VTEX_LINK_ID = 'x-vtex-bh-link-id',

  // Tracing header to be used by jaeger
  VTEX_TRACE = 'jaeger-debug-id'
}
