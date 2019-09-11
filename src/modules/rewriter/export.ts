import { createHash } from 'crypto'
import { writeFile } from 'fs-extra'
import { readJson } from 'fs-extra'
import { Parser } from 'json2csv'
import { concat, length, map, range } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import log from '../../logger'
import { isVerbose } from '../../utils'
import {
  accountAndWorkspace,
  deleteMetainfo,
  MAX_ENTRIES_PER_REQUEST,
  MAX_RETRIES,
  METAINFO_FILE,
  progressBar,
  saveMetainfo,
  sleep,
  RETRY_INTERVAL_S,
} from './utils'

const EXPORTS = 'exports'
const [account, workspace] = accountAndWorkspace

const FIELDS = ['from', 'to', 'type', 'endDate']

const generateListOfRanges = (indexLength: number) =>
  map(
    (n: number) => [n * MAX_ENTRIES_PER_REQUEST, Math.min((n + 1) * MAX_ENTRIES_PER_REQUEST, indexLength)],
    range(0, Math.ceil(indexLength / MAX_ENTRIES_PER_REQUEST))
  )

const handleExport = async (csvPath: string) => {
  const routesIndex = await rewriter.routesIndex()
  const indexLength = length(routesIndex)
  if (indexLength <= 0) {
    log.info('No data to be exported.')
    return
  }
  const indexHash = await createHash('md5')
    .update(`${account}_${workspace}_${JSON.stringify(routesIndex)}`)
    .digest('hex')
  const metainfo = await readJson(METAINFO_FILE).catch(() => ({}))
  const exportMetainfo = metainfo[EXPORTS] || {}
  const listOfRanges = generateListOfRanges(indexLength)
  let counter = exportMetainfo[indexHash] ? exportMetainfo[indexHash].counter : 0
  let listOfRoutes = exportMetainfo[indexHash] ? exportMetainfo[indexHash].data : []

  const bar = progressBar('Exporting routes...', counter, length(listOfRanges))

  const listener = createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => {
    saveMetainfo(metainfo, EXPORTS, indexHash, counter, listOfRoutes)
    console.log('\n')
    process.exit()
  })

  await Promise.each(listOfRanges.splice(counter), async ([from, to]) => {
    let result: any
    try {
      result = await rewriter.exportRedirects(from, to)
    } catch (e) {
      await saveMetainfo(metainfo, EXPORTS, indexHash, counter, listOfRoutes)
      listener.close()
      throw e
    }
    listOfRoutes = concat(listOfRoutes, result)
    counter++
    bar.tick()
  })
  const json2csvParser = new Parser({ fields: FIELDS, delimiter: ';', quote: '' })
  const csv = json2csvParser.parse(listOfRoutes)
  await writeFile(`./${csvPath}`, csv)
  log.info('\nFinished!\n')
  listener.close()
  deleteMetainfo(metainfo, EXPORTS, indexHash)
}

let retryCount = 0
export default async (csvPath: string) => {
  try {
    await handleExport(csvPath)
  } catch (e) {
    log.error('\nError handling export\n')
    if (retryCount >= MAX_RETRIES) {
      throw e
    }
    if (isVerbose) {
      console.log(e)
    }
    log.error(`Retrying in ${RETRY_INTERVAL_S} seconds...`)
    log.info('Press CTRL+C to abort')
    await sleep(RETRY_INTERVAL_S * 1000)
    retryCount++
    await module.exports.default(csvPath)
  }
}
