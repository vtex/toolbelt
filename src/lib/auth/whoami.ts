import { greeting } from '../../greeting'
import log from '../../logger'

export async function authWhoami() {
  const lines = await greeting()
  lines.forEach((msg: string) => log.info(msg))
}
