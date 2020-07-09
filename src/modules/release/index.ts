import chalk from 'chalk'
import { indexOf, prop } from 'ramda'
import semver from 'semver'

import log from '../../api/logger'
import {
  add,
  bump,
  checkGit,
  checkIfInGitRepo,
  commit,
  confirmRelease,
  incrementVersion,
  postRelease,
  preRelease,
  push,
  readVersion,
  tag,
  updateChangelog,
} from './utils'

export const releaseTypeAliases = {
  pre: 'prerelease',
}
export const supportedReleaseTypes = ['major', 'minor', 'patch', 'prerelease']
export const supportedTagNames = ['stable', 'beta', 'hkignore']
const releaseTypesToUpdateChangelog = ['major', 'minor', 'patch']
const tagNamesToUpdateChangelog = ['stable']

const shouldUpdateChangelog = (releaseType, tagName) => {
  return (
    (releaseTypesToUpdateChangelog.indexOf(releaseType) >= 0 && tagNamesToUpdateChangelog.indexOf(tagName) >= 0) ||
    semver.valid(releaseType)
  )
}

const getNewAndOldVersions = (releaseType, tagName) => {
  if (semver.valid(releaseType)) {
    // If `releaseType` is a valid (semver) version, use it.
    const oldVersion = readVersion()
    const newVersion = semver.parse(releaseType).version
    if (!semver.gt(newVersion, oldVersion)) {
      // TODO: Remove the below log.error when toolbelt has better error handling.
      log.error(`The new version has to be greater than the old one: \
${newVersion} <= ${oldVersion}`)
      throw new Error(`The new version has to be greater than the old one: \
${newVersion} <= ${oldVersion}`)
    }
    return [oldVersion, newVersion]
  }
  // Else `releaseType` is just a regular release type. Then we increment the
  // actual version.
  // Check if releaseType is valid.
  if (indexOf(releaseType, supportedReleaseTypes) === -1) {
    // TODO: Remove the below log.error when toolbelt has better error handling.
    log.error(`Invalid release type: ${releaseType}
Valid release types are: ${supportedReleaseTypes.join(', ')}`)
    throw new Error(`Invalid release type: ${releaseType}
Valid release types are: ${supportedReleaseTypes.join(', ')}`)
  }
  // Check if tagName is valid.
  if (indexOf(tagName, supportedTagNames) === -1) {
    // TODO: Remove the below log.error when toolbelt has better error handling.
    log.error(`Invalid release tag: ${tagName}
Valid release tags are: ${supportedTagNames.join(', ')}`)
    throw new Error(`Invalid release tag: ${tagName}
Valid release tags are: ${supportedTagNames.join(', ')}`)
  }
  const oldVersion = readVersion()
  const newVersion = incrementVersion(oldVersion, releaseType, tagName)
  return [oldVersion, newVersion]
}

export default async (
  releaseType = 'patch', // This arg. can also be a valid (semver) version.
  tagName = 'beta'
) => {
  checkGit()
  checkIfInGitRepo()
  const normalizedReleaseType = prop<string>(releaseType, releaseTypeAliases) || releaseType
  const [oldVersion, newVersion] = getNewAndOldVersions(normalizedReleaseType, tagName)

  log.info(`Old version: ${chalk.bold(oldVersion)}`)
  log.info(`New version: ${chalk.bold.yellow(newVersion)}`)

  const [month, day, year] = new Date()
    .toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
    .split('/')

  // Pachamama v2 requires that version tags start with a 'v' character.
  const tagText = `v${newVersion}`
  const changelogVersion = `\n\n## [${newVersion}] - ${year}-${month}-${day}`

  if (!(await confirmRelease())) {
    // Abort release.
    return
  }
  log.info('Starting release...')
  try {
    await preRelease()
    await bump(newVersion)
    if (shouldUpdateChangelog(normalizedReleaseType, tagName)) {
      updateChangelog(changelogVersion)
    }
    await add()
    await commit(tagText)
    await tag(tagText)
    await push(tagText)
    await postRelease()
  } catch (e) {
    log.error(`Failed to release \n${e}`)
  }
}
