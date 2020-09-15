import chalk from 'chalk'
import { execSync } from 'child-process-es6-promise'
import { close, existsSync, openSync, readFileSync, readJsonSync, writeJsonSync, writeSync } from 'fs-extra'
import { resolve } from 'path'
import { path } from 'ramda'
import semver from 'semver'
import log from '../../api/logger'
import { getAppRoot } from '../../api/manifest/ManifestUtil'
import { promptConfirm } from '../../api/modules/prompts'

const unreleased = '## [Unreleased]'

export class ReleaseUtils {
  private root: string
  private versionFile: string
  private changelogPath: string

  constructor() {
    this.root = getAppRoot()
    this.versionFile = resolve(this.root, 'manifest.json')
    this.changelogPath = resolve(this.root, 'CHANGELOG.md')
  }

  private readVersionFile = () => {
    try {
      return readJsonSync(this.versionFile)
    } catch (e) {
      if (e.code === 'ENOENT') {
        log.error(`Version file not found: ${this.versionFile}.`)
      }
      throw e
    }
  }

  private writeVersionFile = (newManifest: any) => {
    writeJsonSync(this.versionFile, newManifest, { spaces: 2 })
  }

  public readVersion = () => {
    const version = semver.valid(this.readVersionFile().version, true)
    if (!version) {
      throw new Error(`Invalid app version: ${version}`)
    }
    return version
  }

  public incrementVersion = (rawOldVersion: string, releaseType: semver.ReleaseType, tagName: string) => {
    const oldVersion = semver.valid(rawOldVersion, true)
    if (tagName !== 'stable' && releaseType !== 'prerelease') {
      return semver.inc(oldVersion, `pre${releaseType}` as semver.ReleaseType, false, tagName)
    }
    return semver.inc(oldVersion, releaseType)
  }

  public commit = (tagName: string) => {
    const commitMessage = `Release ${tagName}`
    let successMessage = `File(s) ${this.versionFile} commited`
    if (existsSync(this.changelogPath)) {
      successMessage = `Files ${this.versionFile} ${this.changelogPath} commited`
    }
    return this.runCommand(`git commit -m "${commitMessage}"`, successMessage, true)
  }

  public tag = (tagName: string) => {
    const tagMessage = `Release ${tagName}`
    return this.runCommand(`git tag ${tagName} -m "${tagMessage}"`, `Tag created: ${tagName}`, true)
  }

  public push = (tagName: string) => {
    return this.runCommand(`git push && git push origin ${tagName}`, 'Pushed commit and tags', true, 2)
  }

  public gitStatus = () => {
    return this.runCommand('git status', '', true)
  }

  public checkNothingToCommit = () => {
    const response = this.gitStatus()
    return /nothing to commit/.test(response)
  }

  public checkIfGitPushWorks = () => {
    try {
      this.runCommand('git push', '', true, 2, true)
    } catch (e) {
      log.error(`Failed pushing to remote.`)
      throw e
    }
  }

  public preRelease = () => {
    const msg = 'Pre release'
    if (!this.checkNothingToCommit()) {
      throw new Error('Please commit your changes before proceeding.')
    }
    this.checkIfGitPushWorks()
    const key = 'prereleasy'
    this.runScript(key, msg)
    if (!this.checkNothingToCommit()) {
      const commitMessage = `Pre release commit\n\n ${this.getScript(key)}`
      return this.commit(commitMessage)
    }
  }

  public confirmRelease = async (): Promise<boolean> => {
    const answer = await promptConfirm(chalk.green('Are you sure?'))
    if (!answer) {
      log.info('Cancelled by user')
      return false
    }
    return true
  }

  public checkGit = () => {
    try {
      execSync('git --version')
    } catch (e) {
      log.error(`${chalk.bold(`git`)} is not available in your system. \
  Please install it if you wish to use ${chalk.bold(`vtex release`)}`)
      throw e
    }
  }

  public checkIfInGitRepo = () => {
    try {
      execSync('git rev-parse --git-dir')
    } catch (e) {
      log.error(`The current working directory is not in a git repo. \
  Please run ${chalk.bold(`vtex release`)} from inside a git repo.`)
      throw e
    }
  }

  public postRelease = () => {
    const msg = 'Post release'
    if (this.getScript('postrelease')) {
      return this.runScript('postrelease', msg)
    }
    if (this.getScript('postreleasy')) {
      return this.runScript('postreleasy', msg)
    }
  }

  public add = () => {
    let gitAddCommand = `git add "${this.versionFile}"`
    let successMessage = `File ${this.versionFile} added`
    if (existsSync(this.changelogPath)) {
      gitAddCommand += ` "${this.changelogPath}"`
      successMessage = `Files ${this.versionFile} ${this.changelogPath} added`
    }
    return this.runCommand(gitAddCommand, successMessage, true)
  }

  public updateChangelog = (changelogVersion: any) => {
    if (existsSync(this.changelogPath)) {
      let data: string
      try {
        data = readFileSync(this.changelogPath).toString()
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
        const file = openSync(this.changelogPath, 'r+')
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

  public bump = (newVersion: string) => {
    const manifest = this.readVersionFile()
    manifest.version = newVersion
    this.writeVersionFile(manifest)
    log.info(`Version bumped to ${chalk.bold.green(newVersion)}`)
  }

  private getScript = (key: string): string => {
    return path(['scripts', key], this.readVersionFile())
  }

  private runCommand = (
    cmd: string,
    successMessage: string,
    hideOutput = false,
    retries = 0,
    hideSuccessMessage = false
  ) => {
    let output
    try {
      output = execSync(cmd, { stdio: hideOutput ? 'pipe' : 'inherit', cwd: this.root })
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
      return this.runCommand(cmd, successMessage, hideOutput, retries - 1, hideSuccessMessage)
    }
  }

  private runScript = (key: string, msg: string) => {
    const cmd: string = this.getScript(key)
    return cmd ? this.runCommand(cmd, msg, false) : undefined
  }
}
