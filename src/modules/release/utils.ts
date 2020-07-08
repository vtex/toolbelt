import chalk from 'chalk'
import { execSync } from 'child-process-es6-promise'
import { close, existsSync, openSync, readFileSync, readJsonSync, writeJsonSync, writeSync } from 'fs-extra'
import { resolve } from 'path'
import { path } from 'ramda'
import semver from 'semver'
import log from '../../api/logger'
import { getAppRoot } from '../../api/manifest/ManifestUtil'
import { promptConfirm } from '../prompts'

const root = getAppRoot()
const versionFile = resolve(root, 'manifest.json')
const changelogPath = resolve(root, 'CHANGELOG.md')
const unreleased = '## [Unreleased]'

const readVersionFile = () => {
  try {
    return readJsonSync(versionFile)
  } catch (e) {
    if (e.code === 'ENOENT') {
      log.error(`Version file not found: ${versionFile}.`)
    }
    throw e
  }
}

const writeVersionFile = (newManifest: any) => {
  writeJsonSync(versionFile, newManifest, { spaces: 2 })
}

export const readVersion = () => {
  const version = semver.valid(readVersionFile().version, true)
  if (!version) {
    throw new Error(`Invalid app version: ${version}`)
  }
  return version
}

export const incrementVersion = (rawOldVersion: string, releaseType: string, tagName: string) => {
  const oldVersion = semver.valid(rawOldVersion, true)
  if (tagName !== 'stable' && releaseType !== 'prerelease') {
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
  hideOutput = false,
  retries = 0,
  hideSuccessMessage = false
) => {
  let output
  try {
    output = execSync(cmd, { stdio: hideOutput ? 'pipe' : 'inherit', cwd: root })
    if (!hideSuccessMessage) {
      log.info(successMessage + chalk.blue(` >  ${cmd}`))
    }
    return output
  } catch (e) {
    log.error(`Command '${cmd}' exited with error code: ${e.status}`)
    if (retries <= 0) {
      throw e
    }
    log.info(`Retrying...`)
    return runCommand(cmd, successMessage, hideOutput, retries - 1, hideSuccessMessage)
  }
}

const runScript = (key: string, msg: string) => {
  const cmd: string = getScript(key)
  return cmd ? runCommand(cmd, msg, false) : undefined
}

export const commit = (tagName: string) => {
  const commitMessage = `Release ${tagName}`
  let successMessage = `File(s) ${versionFile} commited`
  if (existsSync(changelogPath)) {
    successMessage = `Files ${versionFile} ${changelogPath} commited`
  }
  return runCommand(`git commit -m "${commitMessage}"`, successMessage, true)
}

export const tag = (tagName: string) => {
  const tagMessage = `Release ${tagName}`
  return runCommand(`git tag ${tagName} -m "${tagMessage}"`, `Tag created: ${tagName}`, true)
}

export const push = (tagName: string) => {
  return runCommand(`git push && git push origin ${tagName}`, 'Pushed commit and tags', true, 2)
}

export const gitStatus = () => {
  return runCommand('git status', '', true)
}

export const checkNothingToCommit = () => {
  const response = gitStatus()
  return /nothing to commit/.test(response)
}

export const checkIfGitPushWorks = () => {
  try {
    runCommand('git push', '', true, 2, true)
  } catch (e) {
    log.error(`Failed pushing to remote.`)
    throw e
  }
}

export const preRelease = () => {
  const msg = 'Pre release'
  if (!checkNothingToCommit()) {
    throw new Error('Please commit your changes before proceeding.')
  }
  checkIfGitPushWorks()
  const key = 'prereleasy'
  runScript(key, msg)
  if (!checkNothingToCommit()) {
    const commitMessage = `Pre release commit\n\n ${getScript(key)}`
    return commit(commitMessage)
  }
}

export const confirmRelease = async (): Promise<boolean> => {
  const answer = await promptConfirm(chalk.green('Are you sure?'))
  if (!answer) {
    log.info('Cancelled by user')
    return false
  }
  return true
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

export const postRelease = () => {
  const msg = 'Post release'
  if (getScript('postrelease')) {
    return runScript('postrelease', msg)
  }
  if (getScript('postreleasy')) {
    return runScript('postreleasy', msg)
  }
}

export const add = () => {
  let gitAddCommand = `git add "${versionFile}"`
  let successMessage = `File ${versionFile} added`
  if (existsSync(changelogPath)) {
    gitAddCommand += ` "${changelogPath}"`
    successMessage = `Files ${versionFile} ${changelogPath} added`
  }
  return runCommand(gitAddCommand, successMessage, true)
}

export const updateChangelog = (changelogVersion: any) => {
  if (existsSync(changelogPath)) {
    let data: string
    try {
      data = readFileSync(changelogPath).toString()
    } catch (e) {
      throw new Error(`Error reading file: ${e}`)
    }
    if (data.indexOf(unreleased) < 0) {
      log.info(
        chalk.red.bold(
          `I can't update your CHANGELOG. :( \n
        Make your CHANGELOG great again and follow the CHANGELOG format
        http://keepachangelog.com/en/1.0.0/`
        )
      )
    } else {
      const position = data.indexOf(unreleased) + unreleased.length
      const bufferedText = Buffer.from(`${changelogVersion}${data.substring(position)}`)
      const file = openSync(changelogPath, 'r+')
      try {
        writeSync(file, bufferedText, 0, bufferedText.length, position)
        close(file)
        log.info(`updated CHANGELOG`)
      } catch (e) {
        throw new Error(`Error writing file: ${e}`)
      }
    }
  }
}

export const bump = (newVersion: string) => {
  const manifest = readVersionFile()
  manifest.version = newVersion
  writeVersionFile(manifest)
  log.info(`Version bumped to ${chalk.bold.green(newVersion)}`)
}
