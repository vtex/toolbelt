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

export const matchedDepsDiffTable = (
  title1: string,
  title2: string,
  deps1: string[],
  deps2: string[]
) => {
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
    (k) => chalk.red(`-${k}`),
    'right',
    (k:any) => !!k.removed
  )
  setObjectValues(
    addedDeps,
    (k) => chalk.green(`+${k}`),
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
