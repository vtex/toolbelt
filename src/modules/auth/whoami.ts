import { greeting } from '../../greeting'
import log from '../../logger'

export default async (): Promise<void> => {

  throw new Error('TESTE!!!!!!!!!!!!!!!!!!')
  const lines = await greeting()
  lines.forEach((msg: string) => log.info(msg))
}
