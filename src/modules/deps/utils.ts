import { compose, keys } from 'ramda'
import { createAppsClient } from '../../api/clients/IOClients/infra/Apps'

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

const cleanDeps = compose(keys, removeNpm)

export const getCleanDependencies = async (workspace: string) => {
  return (await createAppsClient({ workspace })
    .getDependencies()
    .then(cleanDeps)) as string[]
}
