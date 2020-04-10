import { getCluster, getEnvironment } from '../../utils/conf'

export function configGet(name: string) {
  switch (name) {
    case 'env':
      console.log(getEnvironment() || '')
      break
    case 'cluster':
      console.log(getCluster())
      break
  }
}
