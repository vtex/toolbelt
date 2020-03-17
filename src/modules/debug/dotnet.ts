import { Runtime } from '../../clients/runtime'
import { getIOContext } from '../utils'

export default async (debugInst: string) => {
  const runtimeClient = new Runtime(getIOContext())
  await runtimeClient.debugDotnetApp(debugInst)
}
