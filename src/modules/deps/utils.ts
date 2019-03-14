import { Apps } from '@vtex/api'
import chalk from 'chalk'
import { diffArrays } from 'diff'
import * as R from 'ramda'
import { createTable } from '../../table'

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

const cleanDeps = R.compose(R.keys, removeNpm)

const formatAppId = (appId: string) => {
  const [appVendor, appName] = R.split('.', appId)
  if (!appName) {
    // Then the app is an 'infra' app.
    const [infraAppVendor, infraAppName] = R.split(':', appId)
    return `${chalk.blue(infraAppVendor)}:${infraAppName}`
  }
  return `${chalk.blue(appVendor)}.${appName}`
}

const cleanVersion = (appId: string) => {
  return R.compose<string, string[], string, string>(
    (version: string) => {
      const [pureVersion, build] = R.split('+build', version)
      return (build ? `${pureVersion}(linked)` : pureVersion)
    },
    R.last,
    R.split('@')
  )(appId)
}

export const getCleanDependencies = async (context) => {
  return await new Apps(context)
    .getDependencies()
    .then(cleanDeps)
}

export const matchedDepsDiffTable = (
  title1: string,
  title2: string,
  deps1: string[],
  deps2: string[]
) => {
  const depsDiff = diffArrays(deps1, deps2)
  // Get deduplicated names (no version) of the changed deps.
  const depNames = [...new Set(
    R.compose<string[], any[], string[], string[], string[]>(
      R.map(k => R.head(R.split('@', k))),
      R.flatten,
      R.pluck('value'),
      R.filter((k: any) => !!k.removed || !!k.added)
    )(depsDiff)
  )].sort()
  const produceStartValues = () => (R.map((_) => ([]))(depNames) as any)
  // Each of the following objects will start as a { `depName`: [] }, ... }-like.
  const addedDeps = R.zipObj(depNames, produceStartValues())
  const removedDeps = R.zipObj(depNames, produceStartValues())

  // Custom function to set the objects values.
  const setObjectValues = (obj, formatter, filterFunction) => {
    R.compose<void, any[], any[], any[], any[]>(
      R.map(k => {
        const index = R.head(R.split('@', k))
        obj[index].push(formatter(k))
      }),
      R.flatten,
      R.pluck('value'),
      R.filter(filterFunction)
    )(depsDiff)
    R.mapObjIndexed(
      (_, index) => {
        obj[index] = obj[index].join(',')
      }
    )(obj)
  }

  // Setting the objects values.
  setObjectValues(
    removedDeps,
    (k) => chalk.red(`${cleanVersion(k)}`),
    (k:any) => !!k.removed
  )
  setObjectValues(
    addedDeps,
    (k) => chalk.green(`${cleanVersion(k)}`),
    (k:any) => !!k.added
  )

  const table = createTable() // Set table headers.
  table.push([
    '',
    chalk.bold.yellow(title1),
    chalk.bold.yellow(title2),
  ])

  const formattedDepNames = R.map(formatAppId, depNames)
  // Push array of changed dependencies pairs to the table.
  Array.prototype.push.apply(
    table,
    R.map(
      (k: any[]) => R.flatten(k)
    )(
      R.zip( // zipping 3 arrays.
        R.zip(
          formattedDepNames,
          R.values(removedDeps)
        ),
        R.values(addedDeps)
      )
    )
  )
  return table
}
