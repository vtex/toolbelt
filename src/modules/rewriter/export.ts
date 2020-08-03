import { createHash } from 'crypto'
import { readJson, writeFile } from 'fs-extra'
import { Parser } from 'json2csv'
import ora from 'ora'
import { createInterface } from 'readline'
import { Redirect, Rewriter } from '../../api/clients/IOClients/apps/Rewriter'
import { SessionManager } from '../../api/session/SessionManager'
import log from '../../api/logger'
import { isVerbose } from '../../api/verbose'
import {
  deleteMetainfo,
  DELIMITER,
  encode,
  MAX_RETRIES,
  METAINFO_FILE,
  RETRY_INTERVAL_S,
  saveMetainfo,
  showGraphQLErrors,
  sleep,
} from './utils'

const EXPORTS = 'exports'

const { account, workspace } = SessionManager.getSingleton()

const COLORS = ['cyan', 'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray']
const FIELDS = ['from', 'to', 'type', 'endDate', 'binding']

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

  const rewriter = Rewriter.createClient()

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

  const json2csvParser = new Parser({ fields: FIELDS, delimiter: DELIMITER, quote: '' })
  const encodedRoutes = listOfRoutes.map((route: Redirect) => ({
    ...route,
    from: encode(route.from),
    to: encode(route.to),
  }))
  const csv = json2csvParser.parse(encodedRoutes)
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
