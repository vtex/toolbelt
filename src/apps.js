import chalk from 'chalk'

export function logChanges (changes, time) {
  return changes.reduce((acc, change) => {
    const prefix = chalk.dim(
      acc.length === 0 ? `[${time}] ` : `\n[${time}] `
    )
    if (change.action === 'remove') {
      return acc + `${prefix}${chalk.red('D')} ${change.path}`
    }
    return acc + `${prefix}${chalk.yellow('U')} ${change.path}`
  }, '')
}
