import clipboardy from 'clipboardy'

export const copyToClipboard = (str: string) => {
  if (process.platform === 'linux' && !process.env.DISPLAY) {
    // skip, probably running on a server
    return
  }
  clipboardy.writeSync(str)
}
