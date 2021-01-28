import chalk from 'chalk'
import indent from 'indent-string'
import { COLORS } from '../../api'
import { renderList } from '../../../node_modules/@oclif/plugin-help/lib/list'

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

  for (const [key, value] of Object.entries(commandsId)) {
    body.push(chalk.bold(value))
    body.push(indent(renderCommand(groups[key !== '255' ? key : commandsGroupLength - 1], ctx), 2))
    body.push('\n')
  }

  return body.join('\n')
}
