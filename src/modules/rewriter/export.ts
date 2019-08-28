import { createHash } from 'crypto'
import { writeFile } from 'fs-extra'
import { readJson } from 'fs-extra'
import { Parser } from 'json2csv'
import * as ProgressBar from 'progress'
import { concat, length, map, range } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import { getAccount, getWorkspace } from '../../conf'
import { MAX_ENTRIES_PER_REQUEST, MAX_RETRIES, METAINFO_FILE, saveMetainfo, sleep, validateInput, readCSV, PROGRESS_DEFAULT_CONFIG, progressString } from './utils'

const FIELDS =  ['from', 'to', 'type', 'endDate']

const account = getAccount()
const workspace = getWorkspace()

const generateListOfRanges = (indexLength: number) =>
  map(
    (n: number) => [n * MAX_ENTRIES_PER_REQUEST, Math.min((n + 1) * MAX_ENTRIES_PER_REQUEST, indexLength)],
    range(0, Math.ceil(indexLength / MAX_ENTRIES_PER_REQUEST))
  )

const handleExport = async (csvPath: string) => {
  const routesIndex = await rewriter.routesIndex()
  const indexLength = length(routesIndex)
  if (indexLength <= 0) {
    console.log('Index is empty')
    return
  }
  const indexHash = await createHash('md5').update(`${account}_${workspace}_${JSON.stringify(routesIndex)}`).digest('hex')
  const metainfo = await readJson(METAINFO_FILE).catch(() => ({}))
  const exportMetainfo = metainfo.export || {}
  const listOfRanges = generateListOfRanges(indexLength)
  let counter = exportMetainfo[indexHash] ? exportMetainfo[indexHash].counter : 0
  let listOfRoutes = exportMetainfo[indexHash] ? exportMetainfo[indexHash].data : []

  const bar = new ProgressBar(progressString('Exporting routes...'), {
    ...PROGRESS_DEFAULT_CONFIG,
    curr: counter,
    total: length(listOfRanges),
    })

  const listener = createInterface({ input: process.stdin, output: process.stdout })
    .on('SIGINT', () => {
      saveMetainfo(exportMetainfo,'exports', indexHash, counter, listOfRoutes)
      console.log('\n')
      process.exit()
    })

  await Promise.each(
    listOfRanges.splice(counter),
    async ([from, to]) => {
      let result: any
      try {
        result = await rewriter.exportRedirects(from, to)
      } catch (e) {
        await saveMetainfo(exportMetainfo, 'exports', indexHash, counter, listOfRoutes)
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
  await writeFile(`./${csvPath}`, csv)
  console.log('\nFinished!\n')
  process.exit()
}

let retryCount = 0
export default async (csvPath: string) => {
  try {
    await handleExport(csvPath)
  } catch (e) {
    console.error('\nError handling export\n')
    if (retryCount >= MAX_RETRIES) {
      throw e
    }
    console.error('Retrying in 10 seconds...')
    console.log('Press CTRL+C to abort')
    await sleep(10000)
    await module.exports.default(csvPath, retryCount++)
  }
}
