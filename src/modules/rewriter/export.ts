import { createHash } from 'crypto'
import { writeFile } from 'fs-extra'
import { readJson, writeJsonSync } from 'fs-extra'
import { Parser } from 'json2csv'
import * as ProgressBar from 'progress'
import { concat, length, map, range } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import { sleep } from './utils'

const MAX_ENTRIES_PER_REQUEST = 10
const MAX_AUTOMATIC_RETRIES = 10
const EXPORT_METAINFO_FILE = '.vtex_export_info.json'
const FIELDS =  ['from', 'to', 'type', 'endDate']

const saveCurrentExportState = (exportMetainfo: any, exportData: any, indexHash: string, counter: number) => {
  exportMetainfo[indexHash].counter = counter
  exportMetainfo[indexHash].data = exportData
  writeJsonSync(EXPORT_METAINFO_FILE, exportMetainfo, {spaces: 2})
}

const generateListOfRanges = (indexLength: number) =>
  map(
    (n: number) => [n * MAX_ENTRIES_PER_REQUEST, Math.min((n + 1) * MAX_ENTRIES_PER_REQUEST, indexLength)],
    range(0, Math.ceil(indexLength / MAX_ENTRIES_PER_REQUEST))
  )

const handleExport = async (csvPath: string) => {
  const routesIndex = await rewriter.routesIndex()
  //console.log('These are the routes index: ' + JSON.stringify(routesIndex, null, 2))
  const indexLength = length(routesIndex)
  if (indexLength <= 0) {
    console.log('Index is empty')
    return
  }
  const indexHash = await createHash('md5').update(routesIndex.join(';')).digest('hex')
  const exportMetainfo = await readJson(EXPORT_METAINFO_FILE).catch(() => ({}))
  const listOfRanges = generateListOfRanges(indexLength)
  //console.log(`index Length ${indexLength}`)
  const startBatchIndex = exportMetainfo[indexHash] || 0
  let counter = startBatchIndex
  let listOfRoutes = exportMetainfo[indexHash] || []
  //console.log('This is the list of ranges...' + JSON.stringify(listOfRanges))

  const bar = new ProgressBar('Exporting routes [:bar] :percent', {
    complete: '=',
    curr: counter,
    incomplete: ' ',
    width: '20',
    total: length(listOfRanges),
    })

  const listener = createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      saveCurrentExportState(exportMetainfo, listOfRoutes, indexHash, counter)
      process.exit()
    })

  await Promise.each(
    listOfRanges,
    async ([from, to]) => {
      //console.log(`Exporting batch ${counter}`)
      let result: any
      try {
        result = await rewriter.exportRedirects(from, to)
      } catch (e) {
        await saveCurrentExportState(exportMetainfo, listOfRoutes, indexHash, counter)
        listener.close()
        throw e
      }
      listOfRoutes = concat(listOfRoutes, result)
      counter++
      bar.tick()
    }
  )
  const json2csvParser = new Parser({fields: FIELDS, delimiter: ';', quote: ''})
  const csv = json2csvParser.parse(listOfRoutes)
  //console.log('This is the final CSV: \n' + csv)
  //console.log('Will be written to ' + csvPath)
  await writeFile(`./${csvPath}`, csv)
  process.exit()
}

export default async (csvPath: string, retryCount=0) => {
  try {
    await handleExport(csvPath)
  } catch (e) {
    console.error('Error handling export')
    if (retryCount >= MAX_AUTOMATIC_RETRIES) {
      throw e
    }
    console.error('Retrying in 10 seconds...')
    console.log('Press CTRL+C to abort')
    await sleep(10000)
    await module.exports.default(csvPath, retryCount++)
  }
  console.log('Finished!')
}
