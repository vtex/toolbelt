import prompts from 'prompts'

interface PromptState {
  aborted: boolean
}

const enableTerminalCursor = () => {
  process.stdout.write('\x1B[?25h')
}

const onState = (state: PromptState) => {
  if (state.aborted) {
    // If we don't re-enable the terminal cursor before exiting
    // the program, the cursor will remain hidden
    enableTerminalCursor()
    process.stdout.write('\n')
    process.exit(1)
  }
}

export const promptConfirm = async (message: string, initial = true): Promise<boolean> => {
  const { response } = await prompts([{ message, initial, type: 'confirm', name: 'response', onState }])
  return response
}
