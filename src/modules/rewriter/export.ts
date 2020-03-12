import { writeFile, readJson } from 'fs-extra'
import ora from 'ora'

import { Parser } from 'json2csv'
import { compose, concat, length, map, range, pluck, prop, sum } from 'ramda'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import log from '../../logger'
import { isVerbose } from '../../utils'
import {
  accountAndWorkspace,
  deleteMetainfo,
  MAX_ENTRIES_PER_REQUEST,
  MAX_RETRIES,
  progressBar,
  saveMetainfo,
  sleep,
  RETRY_INTERVAL_S,
  showGraphQLErrors,
} from './utils'

const EXPORTS = 'exports'
const [account, workspace] = accountAndWorkspace

const COLORS = ['cyan', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray']
const FIELDS = ['from', 'to', 'type', 'endDate']

const handleExport = async (csvPath: string) => {
  const spinner = ora('Exporting redirects....').start();

  // TODO: Add fallback in case there are problems
  // TODO: CHanges spinner colour according to the number of routes exported
  // const listener = createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => {
  //   saveMetainfo(metainfo, EXPORTS, indexHash, counter, listOfRoutes)
  //   console.log('\n')
  //   process.exit()
  // })

  let listOfRoutes = [] // exportMetainfo[indexHash] ? exportMetainfo[indexHash].data : []
  let next: string
  let count = 2
  do {
    try {
      const result = await rewriter.exportRedirects(next)
      listOfRoutes = concat(listOfRoutes, result.routes)
      
      spinner.color = COLORS[count % COLORS.length] as any
      spinner.text = `Exporting redirects....\t\t${listOfRoutes.length} Done`
      next = result.next
      count++
    } catch (e) {
      // saveMetainfo(metainfo, EXPORTS, indexHash, counter, listOfRoutes)
      // listener.close()
      throw e
    }
  } while (next)
  spinner.stop()

  const json2csvParser = new Parser({ fields: FIELDS, delimiter: ';', quote: '' })
  const csv = json2csvParser.parse(listOfRoutes)
  await writeFile(`./${csvPath}`, csv)
  log.info('Finished!\n')
  // listener.close()
  // deleteMetainfo(metainfo, EXPORTS, indexHash)
}

let retryCount = 0
export default async (csvPath: string) => {
  try {
    await handleExport(csvPath)
  } catch (e) {
    log.error('Error handling export\n')
    showGraphQLErrors(e)
    if (isVerbose) {
      console.log(e)
    }
    if (retryCount >= MAX_RETRIES) {
      process.exit()
    }
    log.error(`Retrying in ${RETRY_INTERVAL_S} seconds...`)
    log.info('Press CTRL+C to abort')
    await sleep(RETRY_INTERVAL_S * 1000)
    retryCount++
    await module.exports.default(csvPath)
  }
}
