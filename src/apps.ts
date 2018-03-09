import chalk from 'chalk'

const DELETE_SIGN = chalk.red('D')
const UPLOAD_SIGN = chalk.yellow('U')

export function changesToString (changes: Change[], time: string): string {
  return changes.reduce((acc: string, {action, path}: Change) => {
    const prefix = chalk.dim(acc.length === 0 ? `[${time}] ` : `\n[${time}] `)
    if (action === 'remove') {
      return acc + `${prefix}${DELETE_SIGN} ${path}`
    }
    return acc + `${prefix}${UPLOAD_SIGN} ${path}`
  }, '')
}
