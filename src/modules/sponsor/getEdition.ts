import { Sponsor } from '../../clients/sponsor'
import log from '../../logger'
import { getIOContext, options } from './utils'

export default async () => {
  const sponsorClient = new Sponsor(getIOContext(), options)
  const response = await sponsorClient.getEdition()
  console.log(response)
  log.info(response.data)
}
