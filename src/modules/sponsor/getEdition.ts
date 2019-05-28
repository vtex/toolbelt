import { Sponsor } from '../../clients/sponsor'
import log from '../../logger'
import { getIOContext, options } from './utils'

export default async () => {
  const sponsor = new Sponsor(getIOContext(), options)
  const response = await sponsor.getEdition()
  log.info(response.data)
}


