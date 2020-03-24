import { createHash } from 'crypto'
import { writeFile, readJson } from 'fs-extra'
import ora from 'ora'

import { Parser } from 'json2csv'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import log from '../../logger'
import { isVerbose } from '../../utils'
import {
  accountAndWorkspace,
  deleteMetainfo,
  MAX_RETRIES,
  METAINFO_FILE,
  saveMetainfo,
  sleep,
  RETRY_INTERVAL_S,
  showGraphQLErrors,
} from './utils'

const EXPORTS = 'exports'

const [account, workspace] = accountAndWorkspace

const COLORS = ['cyan', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray']
const FIELDS = ['from', 'to', 'type', 'endDate', 'bindings']

const handleExport = async (csvPath: string) => {
  const indexHash = createHash('md5')
    .update(`${account}_${workspace}_${csvPath}`)
    .digest('hex')
  const metainfo = await readJson(METAINFO_FILE).catch(() => ({}))
  const exportMetainfo = metainfo[EXPORTS] || {}

  const spinner = ora('Exporting redirects....').start()

  let { listOfRoutes, next } = exportMetainfo[indexHash]
    ? exportMetainfo[indexHash].data
    : { listOfRoutes: [], next: undefined }
  let count = 2

  const listener = createInterface({ input: process.stdin, output: process.stdout }).on('SIGINT', () => {
    saveMetainfo(metainfo, EXPORTS, indexHash, 0, { next, listOfRoutes })
    console.log('\n')
    process.exit()
  })

  do {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await rewriter.exportRedirects(next)
      listOfRoutes = listOfRoutes.concat(result.routes)

      spinner.color = COLORS[count % COLORS.length] as any
      spinner.text = `Exporting redirects....\t\t${listOfRoutes.length} Done`
      next = result.next
      count++
    } catch (e) {
      saveMetainfo(metainfo, EXPORTS, indexHash, 0, { next, listOfRoutes })
      listener.close()
      spinner.stop()
      throw e
    }
  } while (next)
  spinner.stop()

  const json2csvParser = new Parser({ fields: FIELDS, delimiter: ';', quote: '' })
  const csv = json2csvParser.parse(listOfRoutes)
  await writeFile(`./${csvPath}`, csv)
  log.info('Finished!\n')
  listener.close()
  deleteMetainfo(metainfo, EXPORTS, indexHash)
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
