import {filterCommands, filterOptions, toArray} from './finder'
import {map, mapObjIndexed, values} from 'ramda'

export function help (tree) {
  const rootCommands = filterCommands(tree)
  const rootOptions = filterOptions(tree)

  return `
  Usage: vtex <command> [options]

  Commands:

${values(mapObjIndexed(formatCommand, rootCommands)).join('\n')}

  Options:

${map(formatOption, rootOptions.options).join('\n')}
`
}

function formatCommand (c, k) {
  return `    ${k} ${formatRequiredArgs(c)}${formatOptionalArgs(c)}- ${c.description}`
}

function formatRequiredArgs (c) {
  return c.requiredArgs ? `<${toArray(c.requiredArgs).join('> <')}> ` : ''
}

function formatOptionalArgs (c) {
  return c.optionalArgs ? `[${toArray(c.requiredArgs).join('] [')}]` : ''
}

function formatOption (o) {
  return '    ' + o.short + ' ' + o.description
}
