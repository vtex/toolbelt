import {filterCommands, filterNamespaces, filterOptions, toArray} from './finder'
import {map, mapObjIndexed, values} from 'ramda'

export function help (tree) {
  const rootCommands = filterCommands(tree)
  const rootOptions = filterOptions(tree)
  const namespaces = filterNamespaces(tree)

  return `
  Usage: vtex <command> [options]

  Commands:

${values(mapObjIndexed(formatCommand, rootCommands)).join('\n')}

${values(mapObjIndexed(formatNamespace, namespaces)).join('\n')}

  Options:

${map(formatOption, rootOptions.options).join('\n')}
`
}

function formatCommand (c, k) {
  return `    ${c.namespace ? c.namespace + ' ' : ''}${k} ${formatRequiredArgs(c)}${formatOptionalArgs(c)}- ${c.description}`
}

function formatRequiredArgs (c) {
  return c.requiredArgs ? `<${toArray(c.requiredArgs).join('> <')}> ` : ''
}

function formatOptionalArgs (c) {
  return c.optionalArgs ? `[${toArray(c.requiredArgs).join('] [')}]` : ''
}

function addNamespace (namespace) {
  return (command) => {
    command.namespace = namespace
    return command
  }
}

function formatNamespace (node, namespace) {
  return values(mapObjIndexed(formatCommand, map(addNamespace(namespace), node))).join('\n')
}

function formatOption (o) {
  return `    ${formatFlags(o)} ${o.description}`
}

function formatFlags (o) {
  const short = `-${o.short}`
  const long = `--${o.long}`
  return `${[short, long].join(', ')} `
}
