import chalk from 'chalk'

export enum COLORS {
  GREEN = '#8BC34A',
  PINK = '#FF4785',
  BLUE = '#477DFF',
  MAGENTA = 'magenta',
  WHITE = '#FFFFFF',
  YELLOW = '#FFB100',
}

export class ColorifyConstants {
  public static readonly COMMAND_OR_VTEX_REF = (message: string) => chalk.hex(COLORS.PINK)(message)
  public static readonly ID = (id: string) => chalk.hex(COLORS.GREEN)(id)
  public static readonly URL_INTERACTIVE = (url: string) => chalk.hex(COLORS.BLUE).underline(url)
}
