import * as  csv from 'csvtojson'
import * as jsonSplit from 'json-array-split'
import { length } from 'ramda'

import { rewriter } from '../../clients'
import { RedirectInput } from '../../clients/rewriter'

const MAX_ENTRIES_PER_REQUEST = 100  // To be decided

export default async (csvPath: string) => {
  const routes = await csv({delimiter: ';', ignoreEmpty: true}).fromFile(csvPath)
  console.log('These are the routes: ' + JSON.stringify(routes, null, 2))
  const fileLength = length(routes)
  console.log(`file Length ${fileLength}`)
  const routesList = jsonSplit(routes, MAX_ENTRIES_PER_REQUEST)
  console.log(`routes list` + JSON.stringify(routesList, null, 2))
  console.log(`Import list has been divided into ${length(routesList)} batches`)
  let counter = 0
  await Promise.each(
    routesList,
    async (redirects: RedirectInput[]) => {
      console.log(`Importing batch ${counter}`)
      await rewriter.importRedirects(redirects)
      counter++
      console.log('Done')
    }
  )
  console.log('Finished')
}
