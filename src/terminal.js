import {clearLine, cursorTo} from 'readline'

export function clearAbove () {
  clearLine(process.stdout, 0)
  cursorTo(process.stdout, 0)
}
