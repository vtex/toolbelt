import { greeting } from '../../greeting'
import log from '../../api/logger'

export default async (): Promise<void> => {
  const lines = await greeting()
  lines.forEach((msg: string) => log.info(msg))
}
