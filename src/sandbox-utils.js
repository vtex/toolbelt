import chalk from 'chalk'

export function logChanges (changes) {
  changes.forEach(change => {
    if (change.action === 'remove') {
      console.log(chalk.red('D'), change.path)
    }
    console.log(chalk.yellow('U'), change.path)
  })
}
