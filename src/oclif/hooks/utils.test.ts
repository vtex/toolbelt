import { isHelpInvocation } from './utils'

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
