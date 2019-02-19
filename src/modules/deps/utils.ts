import { Apps } from '@vtex/api'
import chalk from 'chalk'
import * as Table from 'cli-table2'
import { diffArrays } from 'diff'
import * as R from 'ramda'

const isNpm = dep => dep.startsWith('npm:')

export const removeNpm = (deps, inValues?) => {
  Object.keys(deps).forEach(key => {
    if (isNpm(key)) {
      return delete deps[key]
    }
    if (inValues) {
      deps[key] = deps[key].filter(d => !isNpm(d))
    }
  })
  return deps
}

export const cleanDeps = R.compose(R.keys, removeNpm)

export const getCleanDependencies = async (context) => {
return await new Apps(context)
  .getDependencies()
  .then(cleanDeps)
}

const stringReducer = (s:string, maxLength: number) => {
  /* The most general app description is as follows:
   * {vendor}.{appName}@{version}+build{buildNumber}
   *
   * This function abbreviates this description so that it does not exceed the
   * maxLength parameter, but always shows the full version and the beginning
   * part of the app name.
   */
  if (s.length <= maxLength) {
    return s
  }
  // If s.length > maxLength we need to reduce the string's size,
  // but still keep the useful information.
  const hideString = '..'
  const versionPrefix = '@'
  const buildPrefix = '+build'
  // First try to remove build number:
  if (s.indexOf(buildPrefix) > -1) {
    if (`${s.split(buildPrefix)[0]}${buildPrefix}${hideString}`.length <= maxLength) {
      return `${s.substring(0, maxLength-hideString.length)}${hideString}`
    }
  }
  // First try didn't work, so do some more elaborated work.
  // We will abbreviate the both the app name and the build number
  // (if it exists).
  const [appName, version] = s.split(versionPrefix)
  let pureVersion
  let additionalLength
  if (version.indexOf(buildPrefix) > -1) {
    // There is a build number, so we will need to abbreviate it as well.
    pureVersion = version.split(buildPrefix)[0]
    additionalLength = buildPrefix.length + hideString.length
  } else {
    // No build number.
    pureVersion = version
    additionalLength = 0
  }
  const appNameDesiredLength = (maxLength - hideString.length -
    pureVersion.length - versionPrefix.length - additionalLength)
  const reducedAppName = `${appName.substr(0, appNameDesiredLength)}${hideString}`
  const stringWithReducedName = `${reducedAppName}${versionPrefix}${version}`
  const finalString =
    `${stringWithReducedName.substring(0, maxLength-hideString.length)}${hideString}`
  return finalString
}

export const matchedDepsDiffTable = (
  title1: string,
  title2: string,
  deps1: string[],
  deps2: string[]
) => {
  const colWidth = 40 // column width of the table.
  const depsDiff = diffArrays(deps1, deps2)
  // Get deduplicated names (no version) of the changed deps.
  const depNames = [...new Set(
    R.compose<any[], any[], any[], any[], any[]>(
      R.map(k => k.split('@')[0]),
      R.flatten,
      R.pluck('value'),
      R.filter((k: any) => !!k.removed || !!k.added)
    )(depsDiff)
  )].sort()
  const startValues = R.map(R.always(''))(depNames) as any
  // Each of the following objects will start as {`depName`: '', ...}-like.
  const addedDeps = R.zipObj(depNames, startValues)
  const removedDeps = R.zipObj(depNames, startValues)

  // Custom function to set the objects values.
  const setObjectValues = (obj, formatter, hAlign, filterFunction) => {
    R.compose<any[], any[], any[], any[], any[]>(
      R.map(k => {
        const index = k.split('@')[0]
        obj[index] = {content: formatter(k), hAlign}
      }),
      R.flatten,
      R.pluck('value'),
      R.filter(filterFunction)
    )(depsDiff)
  }

  // Setting the objects values.
  setObjectValues(
    removedDeps,
    (k) => chalk.red(stringReducer(`-${k}`, colWidth)),
    'right',
    (k:any) => !!k.removed
  )
  setObjectValues(
    addedDeps,
    (k) => chalk.green(stringReducer(`+${k}`, colWidth)),
    'left',
    (k:any) => !!k.added
  )

  const table = new Table({
    // Minimalist table style.
    chars: {
      'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': '',
      'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': '',
      'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': '',
      'right': '' , 'right-mid': '' , 'middle': ' => ',
    },
    style: { 'padding-left': 0, 'padding-right': 0, 'head':'center'},
    colWidths: [40, 40],
  })
  // Set table headers.
  table.push([
    {content: chalk.bold.blue(title1), hAlign: 'right'},
    {content: chalk.bold.blue(title2), hAlign: 'left'},
  ])
  // Push array of changed dependencies pairs to the table.
  Array.prototype.push.apply(
    table,
    R.zip(R.values(removedDeps), R.values(addedDeps))
  )
  return table
}
