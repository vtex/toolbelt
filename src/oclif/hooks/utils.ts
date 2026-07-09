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
