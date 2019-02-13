import chalk from 'chalk'
import {execSync} from 'child-process-es6-promise'
import {
  close,
  existsSync,
  openSync,
  pathExistsSync,
  readFileSync,
  readJsonSync,
  writeJsonSync,
  writeSync,
} from 'fs-extra'
import * as inquirer from 'inquirer'
import {safeLoad} from 'js-yaml'
import {find, path, prop}  from 'ramda'
import * as semver from 'semver'
import log from '../../logger'

const versionFile = './manifest.json'
const changelogPath = 'CHANGELOG.md'
const unreleased = '## [Unreleased]'

const readVersionFile = () => {
  try {
    return readJsonSync(versionFile)
  } catch(e) {
    if (e.code === 'ENOENT') {
      log.error(`Version file not found: ${versionFile}.`)
    }
    throw e
  }
}

const writeVersionFile = (newManifest: any) => {
  writeJsonSync(versionFile, newManifest, {spaces: 2})
}

export const readVersion = () => {
  const version = semver.valid(readVersionFile().version, true)
  if (!version) {
    throw new Error(`Invalid app version: ${version}`)
  }
  return version
}

export const getNewVersion = (
  rawOldVersion: string,
  releaseType: string,
  tagName: string
) => {
  const oldVersion = semver.valid(rawOldVersion, true)
  // Support for "promote" predicate, which bumps prerelease to stable,
  // without changing version number.
  if (releaseType === 'promote') {
    // Promote only makes sense when there is a prerelease.
    if (!semver.prerelease(oldVersion)) {
      throw new Error(`The version you are trying to promote to stable (
        ${oldVersion}) is already stable.\n`)
    } else {
      // returns the same version without prelease part.
      return semver.inc(oldVersion)
    }
  }
  // For other types, simply increment.
  if (tagName && tagName !== 'stable') {
    return semver.inc(oldVersion, `pre${releaseType}`, tagName)
  }
  return semver.inc(oldVersion, releaseType)
}

const getScript = (key: string): string => {
  return path(['scripts', key], readVersionFile())
}

const runCommand = (
  cmd: string,
  successMessage: string,
  dryRun: boolean,
  hideSuccessMessage = false,
  hideOutput = false
) => {
  let output
  if (!dryRun) {
    try {
      output = execSync(cmd, {stdio: hideOutput ? 'pipe' : ['inherit', 'pipe']})
    } catch(e) {
      log.error(`Command '${cmd}' exited with error code: ${e.code}`)
      throw e
    }
  }
  if (!hideSuccessMessage) {
    log.info(successMessage + chalk.blue(` >  ${cmd}`))
  }
  return output
}

const runScript = (
  key: string,
  msg: string,
  dryRun: boolean,
  quiet: boolean
) => {
  const cmd: string = getScript(key)
  return cmd ? runCommand(cmd, msg, dryRun, quiet, false) : undefined
}

export const commit = (
  tagName: string,
  dryRun: boolean,
  quiet: boolean
) => {
  const commitMessage = `Release ${tagName}`
  let successMessage = `File(s) ${versionFile} commited`
  if (existsSync(changelogPath)) {
    successMessage = `Files ${versionFile} ${changelogPath} commited`
  }
  return runCommand(
    `git commit -m "${commitMessage}"`,
    successMessage,
    dryRun,
    quiet,
    true
  )
}

export const tag = (
  tagName: string,
  dryRun: boolean,
  quiet: boolean
) => {
  const tagMessage = `Release ${tagName}`
  return runCommand(`git tag ${tagName} -m "${tagMessage}"`,
    `Tag created: ${tagName}`, dryRun, quiet, true)
}

export const push = (tagName: string, dryRun: boolean, quiet: boolean) => {
    return runCommand(`git push && git push origin ${tagName}`,
      'Pushed commit and tags', dryRun, quiet, true)
}

export const preRelease = (
  dryRun: boolean,
  quiet: boolean
) => {
  const msg = 'Pre release'
  if (!checkNothingToCommit(quiet)) {
    throw new Error('Please commit your changes before proceeding.')
  }
  checkIfGitPushWorks()
  const key = 'prereleasy'
  runScript(key, msg, dryRun, quiet)
  if (!checkNothingToCommit(quiet)) {
    const commitMessage = `Pre release commit\n\n ${getScript(key)}`
    return commit(commitMessage, dryRun, true)
  }
}

export const confirmRelease = async (silent: boolean): Promise<boolean> => {
  // No prompt necessary, release and finish.
  if (silent) {
    return true
  }
  // User wants a confirmation prompt.
  const answer = await inquirer.prompt({
    message: chalk.green('Are you sure?'),
    name: 'confirm',
    type: 'confirm',
  }).then(prop('confirm'))
  if (!answer) {
    log.info('Cancelled by user')
    return false
  }
  return true
}

export const getOptionsFile = () => {
  const possibleFiles = ['_releasy.yaml', '_releasy.yml', '_releasy.json']
  const optionsFile = find(pathExistsSync)(possibleFiles)
  if (!optionsFile) {
    return {}
  }
  return safeLoad(readFileSync(optionsFile))
}

export const checkGit = () => {
  try {
    execSync('git --version')
  } catch (e) {
    log.error(`${chalk.bold(`git`)} is not available in your system. \
Please install it if you wish to use ${chalk.bold(`vtex release`)}`)
    throw e
  }
}

export const checkIfInGitRepo = () => {
  try {
    execSync('git rev-parse --git-dir')
  } catch (e) {
    log.error(`The current working directory is not in a git repo. \
Please run ${chalk.bold(`vtex release`)} from inside a git repo.`)
    throw e
  }
}

export const checkIfGitPushWorks = () => {
  try {
    execSync('git push', {stdio: 'pipe'})
  } catch (e) {
    log.error(`Failed pushing to remote.`)
    throw e
  }
}

export const gitStatus = (quiet: boolean) => {
  return runCommand('git status', '', false, quiet, true)
}

export const checkNothingToCommit = (quiet: boolean) => {
  const response = gitStatus(quiet)
  return /nothing to commit/.test(response)
}

export const postRelease = (
  dryRun: boolean,
  quiet: boolean
) => {
  const msg = 'Post releasy'
  return runScript('postreleasy', msg, dryRun, quiet)
}

export const add = (
  dryRun: boolean,
  quiet: boolean
) => {
  let gitAddCommand = `git add ${versionFile}`
  let successMessage = `File ${versionFile} added`
  if (existsSync(changelogPath)) {
    gitAddCommand += ` ${changelogPath}`
    successMessage = `Files ${versionFile} ${changelogPath} added`
  }
  return runCommand(gitAddCommand, successMessage, dryRun, quiet, true)
}

export const bump = (
  dryRun: boolean,
  changelogVersion: any,
  quiet: boolean,
  newVersion: string
) => {
  // Update version on CHANGELOG.md
  if (existsSync(changelogPath) && !dryRun) {
    let data: string
    try {
      data = readFileSync(changelogPath).toString()
    } catch (e) {
      throw new Error(`Error reading file: ${e}`)
    }
    if (data.indexOf(unreleased) < 0 && !quiet) {
      log.info(chalk.red.bold(
      `I can\'t update your CHANGELOG. :( \n
        Make your CHANGELOG great again and follow the CHANGELOG format
        http://keepachangelog.com/en/1.0.0/`
      ))
      } else {
        const position = data.indexOf(unreleased) + unreleased.length
        const bufferedText = Buffer.from(
          `${changelogVersion}${data.substring(position)}`
        )
        const file = openSync(changelogPath, 'r+')
        try {
          writeSync(file, bufferedText, 0, bufferedText.length, position)
          close(file)
        } catch (e) {
          throw new Error(`Error writing file: ${e}`)
        }
      }
  }
  if (!dryRun) {
    const manifest = readVersionFile()
    manifest.version = newVersion
    writeVersionFile(manifest)
  }
  if (!quiet) {
    log.info(`Version bumped to ${chalk.bold.green(newVersion)}`)
  }
}
