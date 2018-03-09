import test from 'ava'
import chalk from 'chalk'
import * as moment from 'moment'

import {changesToString} from './apps'

test('creates a log given a set of changes', t => {
  const time = moment().format('HH:mm:ss')
  const changes: Change[] = [
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
    `${chalk.dim(`[${time}] `)}${chalk.yellow('U')} manifest.json` +
    `${chalk.dim(`\n[${time}] `)}${chalk.yellow('U')} render/assets/Bar.js` +
    `${chalk.dim(`\n[${time}] `)}${chalk.red('D')} render/assets/Foo.js` +
    `${chalk.dim(`\n[${time}] `)}${chalk.red('D')} render/assets/Baz.js`
  const log = changesToString(changes, time)
  t.is(log, expectedLog)
})
