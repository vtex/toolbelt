import { Parser } from 'json2csv'
import { concat, keys, length, map, range, reduce } from 'ramda'

import { rewriter } from '../../clients'

const MAX_ENTRIES_PER_REQUEST = 100  // To be decided
const FIELDS =  ['from', 'to', 'type', 'endDate']


const generateListOfRanges = (indexLength: number) =>
  map(
    (n: number) => [n * MAX_ENTRIES_PER_REQUEST, Math.min((n + 1) * MAX_ENTRIES_PER_REQUEST, indexLength)],
    range(0, Math.ceil(indexLength / MAX_ENTRIES_PER_REQUEST))
  )

export default async (csvPath: string) => {
  const routesIndex = await rewriter.routesIndex().then(keys)
  console.log('These are the routes index: ' + JSON.stringify(routesIndex, null, 2))
  const indexLength = length(routesIndex)
  if (indexLength <= 0) {
    console.log('Index is empty')
    return
  }
  console.log(`index Length ${indexLength}`)
  const listOfRanges = generateListOfRanges(indexLength)
  let counter = 0
  console.log('This is the list of ranges...' + JSON.stringify(listOfRanges))
  const listOfRoutes = await Promise.mapSeries(
    listOfRanges,
    async ([from, to]) => {
      console.log(`Exporting batch ${counter}`)
      const result = await rewriter.exportRedirects(from, to)
      counter++
      return result
    }
  )
  console.log(`Its length is ${length(listOfRoutes[0] as any)}`)
  const fullListOfRoutes = reduce(concat, [], listOfRoutes as any[])
  const json2csvParser = new Parser({fields: FIELDS, delimiter: ';', quote: ''})
  const csv = json2csvParser.parse(fullListOfRoutes)
  console.log('This is the final CSV: \n' + csv)
  console.log('Will be written to ' + csvPath)
}
