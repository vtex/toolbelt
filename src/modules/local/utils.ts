import * as clipboardy from 'clipboardy'

export const copyToClipboard = (str: string) => {
  if (!process.env.DISPLAY) {
    // skip, probably running on a server
    return
  }
  clipboardy.writeSync(str)
}
