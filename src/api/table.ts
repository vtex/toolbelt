import CliTable from 'cli-table'

interface TableOptions {
  head?: string[]
}

export const createTable = (options: TableOptions = {}) =>
  new CliTable({
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: '   ',
    },
    style: { 'padding-left': 0, 'padding-right': 0 },
    ...options,
  })
