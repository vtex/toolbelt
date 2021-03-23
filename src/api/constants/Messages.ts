import supportsHyperlinks from 'supports-hyperlinks'
import ansiEscapes from 'ansi-escapes'
import { ColorifyConstants } from './Colors'
import chalk from 'chalk'

export const formatHyperlink = (text: string, url: string): string =>
  supportsHyperlinks.stdout
    ? `${ColorifyConstants.URL_INTERACTIVE(ansiEscapes.link(text, url))}`
    : `${text} (${ColorifyConstants.URL_INTERACTIVE(url)})`

export const reactTermsOfUse = (): string =>
  `${chalk.bold(
    `⚠️  Caution: VTEX does not grant support for custom storefront projects.`
  )} From this point onwards, you agree to take full responsibility for the component’s development and maintenance.`
