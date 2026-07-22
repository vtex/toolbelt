import chalk from 'chalk'
import indent from 'indent-string'
import { COLORS } from '../../api/constants/Colors'
import { renderList } from '@oclif/plugin-help/lib/list'
import RootHelp from '@oclif/plugin-help/lib/root'
import { OTHER_GROUP_ID } from './constants'

export interface CommandI {
  name: string
  description: string
}

export function getHelpSubject(args: string[]): string | undefined {
  for (const arg of args) {
    if (arg === '--' || arg.startsWith('-')) return
    if (['help', '--help', '-h'].includes(arg)) continue
    return arg
  }
}

/**
 * Detects whether the current invocation is a help request, covering every
 * help form: `vtex help`, `vtex help <command>`, `vtex --help` / `-h` (oclif
 * passes the bare flag as the command id itself) and `vtex <command> --help` /
 * `-h` (`-h` is globally reserved for help in CustomCommand).
 *
 * Note on the `--` separator: everything after `--` is forwarded verbatim to
 * the underlying command as positional values (consistent with
 * `getHelpSubject` above), so `vtex cmd -- --help` must NOT be treated as a
 * help invocation. Only flags appearing before `--` are considered.
 */
export function isHelpInvocation(commandId: string | undefined, argv: string[]): boolean {
  if (commandId != null && ['help', '--help', '-h'].includes(commandId)) return true

  for (const arg of argv) {
    if (arg === '--') break
    if (arg === '--help' || arg === '-h') return true
  }

  return false
}

/**
 * Flattens the oclif config's commands and topics into the flat `CommandI`
 * list used by the help output, dropping namespaced entries (those containing
 * a `:`) so only top-level commands/topics are shown.
 */
export function collectCommands(
  commands: ReadonlyArray<{ id: string; description: string }>,
  topics: ReadonlyArray<{ name: string; description: string }>
): CommandI[] {
  const mappedCommands = commands
    .filter(c => !c.id.includes(':'))
    .map(c => ({ name: c.id, description: c.description }))
  const mappedTopics = topics
    .filter(t => !t.name.includes(':'))
    .map(t => ({ name: t.name, description: t.description }))
  return mappedCommands.concat(mappedTopics)
}

/**
 * Buckets the CLI's commands/topics into display groups for the help output.
 *
 * The group metadata (`commandsGroup` maps command name -> group id, and
 * `commandsId` maps group id -> group label) comes from a feature-flag store
 * that is populated by a non-blocking child process. On a fresh install those
 * values may still be undefined, so we fall back to rendering every command
 * under a single default ("Other") group so that help always works.
 *
 * Commands with no known group id (or a falsy one) are placed in the last
 * group. Duplicate command names are rendered only once.
 */
export function buildCommandGroups(
  commandsGroup: Record<string, number> | undefined,
  commandsId: Record<number, string> | undefined,
  allCommands: CommandI[]
): { commandsId: Record<number, string>; groups: CommandI[][] } {
  const resolvedCommandsGroup: Record<string, number> = commandsGroup ?? {}
  const resolvedCommandsId: Record<number, string> = commandsId ?? { [OTHER_GROUP_ID]: 'Other' }
  const commandsGroupLength: number = Object.keys(resolvedCommandsId).length

  const groups: CommandI[][] = Object.keys(resolvedCommandsId).map(() => [])
  const seen = new Set<string>()

  allCommands.forEach((command: CommandI) => {
    if (seen.has(command.name)) return
    seen.add(command.name)

    const commandGroupId = resolvedCommandsGroup[command.name]
    if (commandGroupId) {
      groups[commandGroupId].push(command)
    } else {
      groups[commandsGroupLength - 1].push(command)
    }
  })

  return { commandsId: resolvedCommandsId, groups }
}

function renderCommand(commands: CommandI[], ctx: any): string {
  return renderList(
    commands.map(c => [chalk.hex(COLORS.PINK)(c.name), c.description && ctx.render(c.description.split('\n')[0])]),
    {
      spacer: '\n',
      stripAnsi: ctx.opts.stripAnsi,
      maxWidth: ctx.opts.maxWidth - 2,
    }
  )
}

export function renderCommands(commandsId: Record<number, string>, groups: CommandI[][], ctx: any) {
  const body = []
  const commandsGroupLength: number = Object.keys(commandsId).length
  const help = new RootHelp(ctx.config, ctx.opts)

  body.push(help.root())
  body.push(' ')

  for (let [key, value] of Object.entries(commandsId)) {
    key = key !== OTHER_GROUP_ID ? key : (commandsGroupLength - 1).toString()
    if (groups[key].length > 0) {
      body.push(chalk.bold(value))
      body.push(indent(renderCommand(groups[key], ctx), 2))
      body.push(' ')
    }
  }

  return body.join('\n')
}
