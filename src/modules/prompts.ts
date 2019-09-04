import * as Confirm from 'prompt-confirm'

// Prompt definitions that are used in many modules of this project.

export const promptConfirm = async (message: string, initial = true): Promise<boolean> =>
  new Confirm({ message, default: initial }).run()
