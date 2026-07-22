import { isHelpInvocation, buildCommandGroups, collectCommands } from './utils'
import { OTHER_GROUP_ID } from './constants'

describe('isHelpInvocation', () => {
  test.each<[string | undefined, string[], boolean]>([
    // help forms → true
    ['help', [], true],
    ['help', ['deploy'], true],
    ['deploy', ['--help'], true],
    ['deploy', ['-h'], true],
    // oclif passes bare `vtex --help` / `vtex -h` as the command id itself
    ['--help', [], true],
    ['-h', [], true],
    [undefined, ['--help'], true],
    [undefined, ['-h'], true],
    ['workspace', ['use', '--help'], true],
    // non-help forms → false
    ['deploy', [], false],
    ['deploy', ['--', '--help'], false],
    ['deploy', ['--', '-h'], false],
    [undefined, [], false],
    ['link', ['--verbose'], false],
    ['login', ['-h'], true],
    ['login', ['--help'], true],
  ])('commandId=%p argv=%p → %p', (commandId, argv, expected) => {
    expect(isHelpInvocation(commandId, argv)).toBe(expected)
  })
})

describe('collectCommands', () => {
  it('maps commands and topics into a single CommandI list', () => {
    const commands = [
      { id: 'deploy', description: 'deploy app' },
      { id: 'whoami', description: 'who am i' },
    ]
    const topics = [{ name: 'workspace', description: 'workspace topic' }]

    expect(collectCommands(commands, topics)).toEqual([
      { name: 'deploy', description: 'deploy app' },
      { name: 'whoami', description: 'who am i' },
      { name: 'workspace', description: 'workspace topic' },
    ])
  })

  it('drops namespaced (`:`) commands and topics', () => {
    const commands = [
      { id: 'deploy', description: 'top-level' },
      { id: 'workspace:use', description: 'sub-command' },
    ]
    const topics = [
      { name: 'workspace', description: 'top-level topic' },
      { name: 'workspace:foo', description: 'sub-topic' },
    ]

    expect(collectCommands(commands, topics).map(c => c.name)).toEqual(['deploy', 'workspace'])
  })

  it('returns an empty list when there are no commands or topics', () => {
    expect(collectCommands([], [])).toEqual([])
  })
})

describe('buildCommandGroups', () => {
  const cmd = (name: string) => ({ name, description: `${name} description` })

  it('falls back to a single "Other" group when feature flags are undefined', () => {
    const allCommands = [cmd('deploy'), cmd('link'), cmd('whoami')]

    const { commandsId, groups } = buildCommandGroups(undefined, undefined, allCommands)

    expect(commandsId).toEqual({ [OTHER_GROUP_ID]: 'Other' })
    expect(groups).toHaveLength(1)
    expect(groups[0].map(c => c.name)).toEqual(['deploy', 'link', 'whoami'])
  })

  it('places commands into the group defined by the feature flag and unknown ones in the last group', () => {
    // Index 2 is the last group and doubles as the catch-all bucket.
    const commandsGroup = { deploy: 1 }
    const commandsId = { 0: 'Other', 1: 'Apps', 2: 'Catchall' }
    const allCommands = [cmd('deploy'), cmd('unknown')]

    const { groups } = buildCommandGroups(commandsGroup, commandsId, allCommands)

    expect(groups).toHaveLength(3)
    expect(groups[1].map(c => c.name)).toEqual(['deploy'])
    // `unknown` has no group id → falls into the last group.
    expect(groups[groups.length - 1].map(c => c.name)).toEqual(['unknown'])
  })

  it('sends commands with a falsy/absent group id to the last group', () => {
    const commandsGroup = { deploy: 0 } // 0 is falsy → treated as "no group"
    const commandsId = { 0: 'Other', 1: 'Apps' }
    const allCommands = [cmd('deploy')]

    const { groups } = buildCommandGroups(commandsGroup, commandsId, allCommands)

    expect(groups[groups.length - 1].map(c => c.name)).toEqual(['deploy'])
  })

  it('renders duplicate command names only once', () => {
    const allCommands = [cmd('deploy'), cmd('deploy'), cmd('link')]

    const { groups } = buildCommandGroups(undefined, undefined, allCommands)

    expect(groups[0].map(c => c.name)).toEqual(['deploy', 'link'])
  })

  it('returns empty groups when there are no commands', () => {
    const { commandsId, groups } = buildCommandGroups({}, { 0: 'Other' }, [])

    expect(commandsId).toEqual({ 0: 'Other' })
    expect(groups).toEqual([[]])
  })
})
