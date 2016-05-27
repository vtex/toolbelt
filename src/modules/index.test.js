import test from 'ava'
import {mergeAll, values} from 'ramda'
import {
  commandsByModule,
  commandsByName,
  commandsByAlias,
  getCommandList,
  getHandler,
} from './index'

const modules = {
  apps: {
    list: {
      command: 'list',
      alias: 'ls',
      handler: () => {},
    },
    install: {
      command: 'install',
      alias: 'i',
    },
    uninstall: {
      command: 'uninstall',
    },
  },
  auth: {
    login: {
      command: 'login',
    },
    logout: {
      command: 'logout',
    },
  },
}

const byModule = commandsByModule(mergeAll(values(modules)))
const byName = commandsByName(byModule)
const byAlias = commandsByAlias(byModule)
const list = getCommandList(byName)

test('finds commands from modules', t => {
  t.true(byName.list.command === 'list')
  t.true(byName.ls == null)
})

test('finds aliases from modules', t => {
  t.true(byAlias.ls.command === 'list')
  t.true(byAlias.ls === byName.list)
})

test('gets command list', t => {
  t.true(list.length === 5)
  t.true(list[0].command === 'list')
})

test('finds handler by name', t => {
  t.true(getHandler('list', byName, byAlias) === byName.list.handler)
})

test('finds handler by alias', t => {
  t.true(getHandler('ls', byName, byAlias) === byName.list.handler)
})
