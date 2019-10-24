import * as clipboardy from 'clipboardy'

export const copyToClipboard = (str: string) => {
  try {
    clipboardy.writeSync(str)
  } catch (_) {
    // ignores, probably running on a server
  }
}
