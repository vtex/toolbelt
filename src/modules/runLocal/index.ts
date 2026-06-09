/**
 * `vtex run-local` — boots a function extension locally (npm-direct).
 *
 * Reads `extension.yaml` from the cwd, materializes an ephemeral
 * runner under `~/.vtex/run-local-cache/<ver>/` (so the extension
 * folder stays clean), spawns `tsx watch` with the user's source
 * mounted via env var, smoke-tests the port, and streams logs until
 * the dev hits Ctrl+C.
 *
 * Intentionally NOT containerized — first iteration. See ADR-pending.
 *
 * Compatibility note: if the manifest declares a `runtime:` that does
 * not match the host's Node major, we log a warning and try anyway,
 * per the contract agreed with the platform team.
 */
import chalk from 'chalk'
import { ChildProcess, spawn } from 'child_process'
import { connect, Socket } from 'net'
import { homedir } from 'os'
import { join, resolve as resolvePath } from 'path'

// `fs-extra` is in toolbelt deps and gives sync helpers without the
// node-version-dependent `fs/promises` surface used elsewhere.
import * as fsExtra from 'fs-extra'

import { createFlowIssueError } from '../../api/error/utils'
import log from '../../api/logger'

import {
  RUNNER_CACHE_VERSION,
  RUNNER_JS,
  RUNNER_PACKAGE_JSON,
} from './assets'

const EXTENSION_MANIFEST = 'extension.yaml'
const DEFAULT_PORT = 8080
const SMOKE_TEST_MAX_ATTEMPTS = 50
const SMOKE_TEST_INTERVAL_MS = 200

/**
 * Minimal shape of the manifest pieces we touch. We do NOT re-validate
 * the manifest here — that is the orchestrator's job. We only read the
 * fields needed to boot.
 */
interface FunctionManifestLike {
  name: string
  runtime?: string
  entrypoint: string
  routes: unknown[]
  events?: string[]
}

export interface RunLocalOptions {
  port?: number
}

/* ───────────────────── manifest discovery ───────────────────── */

function findManifest(cwd: string): string {
  const candidate = join(cwd, EXTENSION_MANIFEST)
  if (!fsExtra.existsSync(candidate)) {
    throw createFlowIssueError(
      `No ${EXTENSION_MANIFEST} in ${cwd}. Run \`vtex run-local\` from the root of an extension folder.`,
    )
  }
  return candidate
}

function parseManifest(path: string): FunctionManifestLike {
  // Inline import to keep js-yaml's type-less surface at the boundary.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const yaml = require('js-yaml')
  const raw = fsExtra.readFileSync(path, 'utf8')
  const doc = yaml.safeLoad(raw)
  if (!doc || typeof doc !== 'object') {
    throw createFlowIssueError(`${EXTENSION_MANIFEST} did not parse to an object.`)
  }
  const m = doc as Partial<FunctionManifestLike>
  if (!m.name || !m.entrypoint || !Array.isArray(m.routes)) {
    throw createFlowIssueError(
      `${EXTENSION_MANIFEST} is missing required fields (\`name\`, \`entrypoint\`, \`routes\`). Run \`yarn example\` (orchestrator) to surface the exact schema error.`,
    )
  }
  return m as FunctionManifestLike
}

/* ───────────────────────── version check ───────────────────────── */

/** Extracts the major-version number from a `runtime:` like `nodejs24`. */
function declaredNodeMajor(runtime: string | undefined): number | null {
  if (!runtime) return null
  const m = /^nodejs(\d+)$/.exec(runtime)
  return m ? Number(m[1]) : null
}

function hostNodeMajor(): number {
  // `process.version` looks like `v22.21.0`. Take the major.
  const m = /^v(\d+)\./.exec(process.version)
  return m ? Number(m[1]) : 0
}

function warnIfVersionMismatch(manifest: FunctionManifestLike): void {
  const declared = declaredNodeMajor(manifest.runtime)
  const host = hostNodeMajor()
  if (declared == null) {
    log.warn(
      `Manifest declares an unrecognized runtime (\`${manifest.runtime ??
        '<unset>'}\`). Trying to boot anyway with Node ${host} from the host.`,
    )
    return
  }
  if (declared !== host) {
    log.warn(
      `Node version mismatch: manifest declares \`nodejs${declared}\`, host is running Node ${host}. Trying to boot anyway — install Node ${declared} (nvm use ${declared}) to match production semantics.`,
    )
  }
}

/* ───────────────────────── cache dir ───────────────────────── */

function cacheDir(): string {
  return join(homedir(), '.vtex', 'run-local-cache', RUNNER_CACHE_VERSION)
}

/**
 * Materializes the runner files into the cache dir if missing or stale.
 * Returns the cache dir path. Idempotent: re-running is a no-op (and
 * fast) after the first invocation.
 */
function ensureCache(): { path: string; freshlyInstalled: boolean } {
  const dir = cacheDir()
  fsExtra.ensureDirSync(dir)

  const runnerPath = join(dir, 'runner.js')
  const pkgPath = join(dir, 'package.json')
  const nodeModulesPath = join(dir, 'node_modules')

  const runnerChanged =
    !fsExtra.existsSync(runnerPath) ||
    fsExtra.readFileSync(runnerPath, 'utf8') !== RUNNER_JS
  const pkgChanged =
    !fsExtra.existsSync(pkgPath) ||
    fsExtra.readFileSync(pkgPath, 'utf8') !== RUNNER_PACKAGE_JSON

  if (runnerChanged) fsExtra.writeFileSync(runnerPath, RUNNER_JS, 'utf8')
  if (pkgChanged) fsExtra.writeFileSync(pkgPath, RUNNER_PACKAGE_JSON, 'utf8')

  const needsInstall =
    !fsExtra.existsSync(nodeModulesPath) || pkgChanged

  if (needsInstall) {
    log.info(`Installing runner deps in ${chalk.gray(dir)} (one-time)...`)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { execSync } = require('child_process')
    execSync('npm install --silent --no-audit --no-fund', {
      cwd: dir,
      stdio: 'inherit',
    })
  }

  return { path: dir, freshlyInstalled: needsInstall }
}

/* ───────────────────────── port + smoke test ───────────────────────── */

async function portInUse(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const socket: Socket = connect({ host: '127.0.0.1', port }, () => {
      socket.end()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
  })
}

async function waitForPort(port: number): Promise<boolean> {
  for (let attempt = 0; attempt < SMOKE_TEST_MAX_ATTEMPTS; attempt++) {
    if (await portInUse(port)) return true
    await new Promise(r => setTimeout(r, SMOKE_TEST_INTERVAL_MS))
  }
  return false
}

/* ───────────────────────── child process ───────────────────────── */

function spawnRunner(
  cacheDirPath: string,
  extensionDir: string,
  port: number,
): ChildProcess {
  const tsxBin = resolvePath(cacheDirPath, 'node_modules', '.bin', 'tsx')
  if (!fsExtra.existsSync(tsxBin)) {
    throw createFlowIssueError(
      `Runner is missing tsx at ${tsxBin}. Try \`rm -rf ${cacheDir()}\` and re-run.`,
    )
  }

  return spawn(tsxBin, ['watch', 'runner.js'], {
    cwd: cacheDirPath,
    env: {
      ...process.env,
      EXTENSION_DIR: extensionDir,
      PORT: String(port),
    },
    stdio: 'inherit',
  })
}

/* ───────────────────────── main flow ───────────────────────── */

export async function runLocal(options: RunLocalOptions = {}): Promise<void> {
  const cwd = process.cwd()
  const port = options.port ?? DEFAULT_PORT

  log.info(`Reading ${EXTENSION_MANIFEST} from ${chalk.gray(cwd)}`)
  const manifestPath = findManifest(cwd)
  const manifest = parseManifest(manifestPath)
  log.info(
    `Found extension ${chalk.green(manifest.name)} (entrypoint ${chalk.gray(
      manifest.entrypoint,
    )})`,
  )

  warnIfVersionMismatch(manifest)

  if (await portInUse(port)) {
    throw createFlowIssueError(
      `Port ${port} is already in use. Pass \`--port <other>\` or stop whatever is bound to ${port}.`,
    )
  }

  const cache = ensureCache()
  if (cache.freshlyInstalled) log.info('Runner cache ready.')

  log.info(
    `Spawning runner — Ctrl+C to stop (hot reload enabled via ${chalk.gray(
      'tsx watch',
    )})`,
  )
  const child = spawnRunner(cache.path, cwd, port)

  // Track whether the shutdown was requested by the user (Ctrl+C, SIGTERM)
  // so that signal-induced exits from the child are not surfaced as errors.
  let userInitiatedShutdown = false
  const requestShutdown = (signal: NodeJS.Signals) => {
    userInitiatedShutdown = true
    if (!child.killed) child.kill(signal)
  }
  const onSigint = () => requestShutdown('SIGINT')
  const onSigterm = () => requestShutdown('SIGTERM')
  process.on('SIGINT', onSigint)
  process.on('SIGTERM', onSigterm)

  // Smoke test in parallel; do not block child exit on it.
  const smokePromise = waitForPort(port).then(ok => {
    if (ok) {
      log.info(
        chalk.green(`✓ ${manifest.name} is up at http://localhost:${port}`),
      )
    } else {
      log.error(
        `Smoke test failed — port ${port} never started responding. Check the runner logs above.`,
      )
    }
  })

  await new Promise<void>((resolveExit, rejectExit) => {
    child.on('exit', (code, signal) => {
      process.removeListener('SIGINT', onSigint)
      process.removeListener('SIGTERM', onSigterm)
      // Surface smoke-test result in any termination path.
      smokePromise.catch(() => {})

      // A child terminated by signal can manifest in three shapes:
      //   - code === null, signal === 'SIGINT'    (Node killed the child directly)
      //   - code === 130, signal === null         (child exited 128 + SIGINT(2))
      //   - code === 143, signal === null         (child exited 128 + SIGTERM(15))
      // All three are graceful shutdowns when the user pressed Ctrl+C
      // (or the parent received SIGTERM). Treat them as success.
      const isSignalInducedExit =
        signal != null || code === 130 || code === 143

      if (
        userInitiatedShutdown ||
        isSignalInducedExit ||
        code === 0 ||
        code === null
      ) {
        resolveExit()
      } else {
        rejectExit(new Error(`runner exited unexpectedly with code ${code}`))
      }
    })
  })
}
