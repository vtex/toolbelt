export function getHelpSubject(args: string[]): string | undefined {
  for (const arg of args) {
    if (arg === '--') return
    if (arg === 'help' || arg === '--help' || arg === '-h') continue
    if (arg.startsWith('-')) return
    return arg
  }
}
