import chalk from 'chalk'
import {indexOf, merge} from 'ramda'
import log from '../../logger'
import {
  add,
  bump,
  checkGit,
  checkIfInGitRepo,
  commit,
  confirmRelease,
  getNewVersion,
  postRelease,
  preRelease,
  push,
  readVersion,
  tag
} from './utils'

const supportedReleaseTypes = ['major', 'minor', 'patch']

const supportedTagNames = ['stable', 'beta']

interface Options {
  noCommit?: boolean,
  noTag?: boolean,
  noPush?: boolean,
  notes?: boolean,
  dryRun?: boolean,
  silent?: boolean,
  quiet?: boolean,
}

const defaultOptions: Options = {
  noCommit: false,
  noTag: false,
  noPush: false,
  notes: false,
  dryRun: false,
  silent: false,
  quiet: false,
}

export default async (
  releaseType = 'patch',
  tagName = 'beta',
  opts: Options = {}
) => {
  checkGit()
  checkIfInGitRepo()
  // Check if releaseType is valid.
  if (indexOf(releaseType, supportedReleaseTypes) === -1) {
    // TODO: Remove the below log.error when toolbelt has better error handling.
    log.error(`Invalid release type: ${releaseType}`)
    throw new Error(`Invalid release type: ${releaseType}`)
  }
  // Check if tagName is valid.
  if (indexOf(tagName, supportedTagNames) === -1) {
    // TODO: Remove the below log.error when toolbelt has better error handling.
    log.error(`Invalid release tag: ${tagName}`)
    throw new Error(`Invalid release tag: ${tagName}`)
  }

  // Assign default values for arguments and options.
  opts = merge(defaultOptions, opts)

  const oldVersion = readVersion()
  const newVersion = getNewVersion(oldVersion, releaseType, tagName)

  if (!opts.quiet) {
    log.info(`Old version: ${chalk.bold(oldVersion)}`)
    log.info(`New version: ${chalk.bold.yellow(newVersion)}`)
  }

  const [month, day, year] = new Date()
    .toLocaleDateString(
      'en-US',
      {year: '2-digit', month: '2-digit', day: '2-digit'}
    ).split('/')

  // Pachamama v2 requires that version tags start with a 'v' character.
  const tagText = `v${newVersion}`
  const changelogVersion = `\n\n## [${newVersion}] - ${year}-${month}-${day}`

  if (!(await confirmRelease(opts.silent))) {
    // Abort release process.
    return
  }
  if (!opts.quiet) {
    log.info('Starting release...')
  }
  try {
    await preRelease(opts.dryRun, opts.quiet)
    await bump(opts.dryRun, changelogVersion, opts.quiet, newVersion)
    if (!opts.noCommit) {
      await add(opts.dryRun, opts.quiet)
      await commit(tagText, opts.dryRun, opts.quiet)
    }
    if (!opts.noTag) {
      await tag(tagText, opts.dryRun, opts.quiet)
    }
    if (!opts.noPush) {
      await push(tagText, opts.dryRun, opts.quiet)
    }
    await postRelease(opts.dryRun, opts.quiet)
  } catch (e) {
    if (!opts.quiet) {
      log.error(`Failed to release \n${e}`)
    }
  }
}
