import chalk from 'chalk'
import supportsHyperlinks from 'supports-hyperlinks'
import ansiEscapes from 'ansi-escapes'
import { ColorifyConstants } from './Colors'

export const formatHyperlink = (text: string, url: string): string =>
  supportsHyperlinks.stdout
    ? `${ColorifyConstants.URL_INTERACTIVE(ansiEscapes.link(text, url))}`
    : `${text} (${ColorifyConstants.URL_INTERACTIVE(url)})`

export const Messages = {
  USE_SUCCESS: (workspace: string, account: string) =>
    `${chalk.bold('Workspace change:')} You are now using the workspace ${ColorifyConstants.ID(
      workspace
    )} on account ${ColorifyConstants.ID(account)}.\n`,
}
