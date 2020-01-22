import { Runtime } from '../../clients/runtime'
import { getIOContext } from '../utils'

export default async (command: string, options) => {
  const runtimeClient = new Runtime(getIOContext())
  await runtimeClient.executeCommand(command, options.i || options.interactive)
}
