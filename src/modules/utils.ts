import chalk from 'chalk'
import { execSync } from 'child-process-es6-promise'
import { diffArrays } from 'diff'
import { existsSync } from 'fs-extra'
import { resolve as resolvePath } from 'path'
import R from 'ramda'
import log from '../api/logger'
import { getAppRoot } from '../api/manifest/ManifestUtil'
import { createTable } from '../api/table'
import { ColorifyConstants } from '../lib/constants/Colors'
import supportsHyperlinks from 'supports-hyperlinks'
import ansiEscapes from 'ansi-escapes'

export const yarnPath = `"${require.resolve('yarn/bin/yarn')}"`

export const formatNano = (nanoseconds: number): string =>
  `${(nanoseconds / 1e9).toFixed(0)}s ${((nanoseconds / 1e6) % 1e3).toFixed(0)}ms`

export const runYarn = (relativePath: string, force: boolean) => {
  log.info(`Running yarn in ${chalk.green(relativePath)}`)
  const root = getAppRoot()
  const command = force
    ? `${yarnPath} --force --non-interactive --ignore-engines`
    : `${yarnPath} --non-interactive --ignore-engines`
  execSync(command, { stdio: 'inherit', cwd: resolvePath(root, relativePath) })
  log.info('Finished running yarn')
}

export const runYarnIfPathExists = (relativePath: string) => {
  const root = getAppRoot()
  const pathName = resolvePath(root, relativePath)
  if (existsSync(pathName)) {
    try {
      runYarn(relativePath, false)
    } catch (e) {
      log.error(`Failed to run yarn in ${chalk.green(relativePath)}`)
      throw e
    }
  }
}

const formatAppId = (appId: string) => {
  const [appVendor, appName] = R.split('.', appId)
  if (!appName) {
    // Then the app is an 'infra' app.
    const [infraAppVendor, infraAppName] = R.split(':', appId)
    if (!infraAppName) {
      return appId
    }
    return `${chalk.blue(infraAppVendor)}:${infraAppName}`
  }
  return `${chalk.blue(appVendor)}.${appName}`
}

const cleanVersion = (appId: string) => {
  return R.compose<string, string[], string, string>(
    (version: string) => {
      const [pureVersion, build] = R.split('+build', version)
      return build ? `${pureVersion}(linked)` : pureVersion
    },
    R.last,
    R.split('@')
  )(appId)
}

export const matchedDepsDiffTable = (title1: string, title2: string, deps1: string[], deps2: string[]) => {
  const depsDiff = diffArrays(deps1, deps2)
  // Get deduplicated names (no version) of the changed deps.
  const depNames = [
    ...new Set(
      R.compose<string[], any[], string[], string[], string[]>(
        R.map(k => R.head(R.split('@', k))),
        R.flatten,
        R.pluck('value'),
        R.filter((k: any) => !!k.removed || !!k.added)
      )(depsDiff)
    ),
  ].sort((strA, strB) => strA.localeCompare(strB))
  const produceStartValues = () => R.map(_ => [])(depNames) as any
  // Each of the following objects will start as a { `depName`: [] }, ... }-like.
  const addedDeps = R.zipObj(depNames, produceStartValues())
  const removedDeps = R.zipObj(depNames, produceStartValues())

  // Custom function to set the objects values.
  const setObjectValues = (obj, formatter, filterFunction) => {
    R.compose<void, any[], any[], any[], any[]>(
      // eslint-disable-next-line array-callback-return
      R.map(k => {
        const index = R.head(R.split('@', k))
        obj[index].push(formatter(k))
      }),
      R.flatten,
      R.pluck('value'),
      R.filter(filterFunction)
    )(depsDiff)
    R.mapObjIndexed((_, index) => {
      obj[index] = obj[index].join(',')
    })(obj)
  }

  // Setting the objects values.
  setObjectValues(
    removedDeps,
    k => chalk.red(`${cleanVersion(k)}`),
    (k: any) => !!k.removed
  )
  setObjectValues(
    addedDeps,
    k => chalk.green(`${cleanVersion(k)}`),
    (k: any) => !!k.added
  )

  const table = createTable() // Set table headers.
  table.push(['', chalk.bold.yellow(title1), chalk.bold.yellow(title2)])

  const formattedDepNames = R.map(formatAppId, depNames)
  // Push array of changed dependencies pairs to the table.
  Array.prototype.push.apply(
    table,
    R.map((k: any[]) => R.flatten(k))(
      R.zip(
        // zipping 3 arrays.
        R.zip(formattedDepNames, R.values(removedDeps)),
        R.values(addedDeps)
      )
    )
  )
  return table
}

export const formatHyperlink = (text: string, url: string): string =>
  supportsHyperlinks.stdout
    ? `${ColorifyConstants.URL_INTERACTIVE(ansiEscapes.link(text, url))}`
    : `${text} (${ColorifyConstants.URL_INTERACTIVE(url)})`
