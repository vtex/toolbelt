import Confirm from 'prompt-confirm'

// Prompt definitions that are used in many modules of this project.

export const promptConfirm = async (message: string, initial = true): Promise<boolean> => {
  const initialMode = process.stdin.isRaw
  const isStdinTTY = process.stdin.isTTY
  if (isStdinTTY) process.stdin.setRawMode(true)
  const ret = await new Confirm({ message, default: initial }).run()
  if (isStdinTTY) process.stdin.setRawMode(initialMode)
  return ret
}
