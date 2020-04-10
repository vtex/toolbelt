import { greeting } from '../../utils/greeting'
import log from '../../utils/logger'

export async function authWhoami() {
  const lines = await greeting()
  lines.forEach((msg: string) => log.info(msg))
}
