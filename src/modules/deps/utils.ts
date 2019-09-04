import { Apps } from '@vtex/api'
import { compose, keys } from 'ramda'

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

const cleanDeps = compose(
  keys,
  removeNpm
)

export const getCleanDependencies = async context => {
  return await new Apps(context).getDependencies().then(cleanDeps)
}
