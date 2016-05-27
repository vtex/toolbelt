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
      command: 'install <app>',
      alias: 'i <app>',
    },
    uninstall: {
      command: 'uninstall <app>',
    },
  },
  auth: {
    login: {
      command: 'login <account>',
    },
    logout: {
      command: 'logout',
    },
  },
  workspace: {
    newWorkspace: {
      command: 'workspace new <name>',
      alias: 'wn',
    },
    deleteWorkspace: {
      command: 'workspace delete <name>',
      alias: 'wd',
    },
    promoteWorkspace: {
      command: 'workspace promote <name>',
      alias: 'wp',
    },
  },
}

const merged = mergeAll(values(modules))
const byModule = commandsByModule(merged)
const byName = commandsByName(byModule)
const byAlias = commandsByAlias(byModule)
const list = getCommandList(byName)

test('finds commands from modules', t => {
  t.true(byName.list.command === 'list')
  t.true(byName.ls == null)
  t.true(byName['workspace new'].command.indexOf('workspace new') >= 0)
})

test('finds aliases from modules', t => {
  t.true(byAlias.ls.command === 'list')
  t.true(byAlias.ls === byName.list)
  t.true(byAlias.wn.command.indexOf('workspace new') >= 0)
  t.true(byAlias.wn === byName['workspace new'])
})

test('gets command list', t => {
  t.true(list.length === values(merged).length)
  t.true(list[0].command === 'list')
})

test('finds handler by name', t => {
  t.true(getHandler('list', byName, byAlias) === byName.list.handler)
})

test('finds handler with two words by name', t => {
  t.true(getHandler('workspace new', byName, byAlias) === byName['workspace new'].handler)
})

test('finds handler by alias', t => {
  t.true(getHandler('ls', byName, byAlias) === byName.list.handler)
})
