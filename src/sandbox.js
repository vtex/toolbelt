import chalk from 'chalk'

export function logChanges (changes) {
  return changes.reduce((acc, change) => {
    const newline = acc.length === 0 ? '' : '\n'
    if (change.action === 'remove') {
      return acc + `${newline}${chalk.red('D')} ${change.path}`
    }
    return acc + `${newline}${chalk.yellow('U')} ${change.path}`
  }, '')
}
