import test from 'ava'
import chalk from 'chalk'
import {logChanges} from './sandbox'

test('creates a log given a set of changes', t => {
  const changes = [
    {
      action: 'save',
      path: 'manifest.json',
    },
    {
      action: 'save',
      path: 'render/assets/Bar.js',
    },
    {
      action: 'remove',
      path: 'render/assets/Foo.js',
    },
    {
      action: 'remove',
      path: 'render/assets/Baz.js',
    },
  ]
  const expectedLog =
    `${chalk.yellow('U')} manifest.json` +
    `\n${chalk.yellow('U')} render/assets/Bar.js` +
    `\n${chalk.red('D')} render/assets/Foo.js` +
    `\n${chalk.red('D')} render/assets/Baz.js`
  const log = logChanges(changes)
  t.is(log, expectedLog)
})
