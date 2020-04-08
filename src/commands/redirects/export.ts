import { flags as oclifFlags } from '@oclif/command'
import { createHash } from 'crypto'
import { writeFile, readJson } from 'fs-extra'
import ora from 'ora'

import { Parser } from 'json2csv'
import { createInterface } from 'readline'

import { rewriter } from '../../clients'
import log from '../../logger'
import { isVerbose } from '../../utils'
import { CustomCommand } from '../../lib/CustomCommand'
import {
  accountAndWorkspace,
  METAINFO_FILE,
  saveMetainfo,
  deleteMetainfo,
  showGraphQLErrors,
  MAX_RETRIES,
  RETRY_INTERVAL_S,
  sleep,
} from '../../lib/redirects/utils'

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

export default class RedirectsExport extends CustomCommand {
  static description = 'Export all redirects in the current account and workspace'

  static examples = ['vtex redirects:export csvPath']

  static flags = {
    help: oclifFlags.help({ char: 'h' }),
  }

  static args = [{ name: 'csvPath', required: true }]

  private static retryCount = 0

  async run() {
    const { args } = this.parse(RedirectsExport)
    const { csvPath } = args
    try {
      await handleExport(csvPath)
    } catch (e) {
      log.error('Error handling export\n')
      showGraphQLErrors(e)
      if (isVerbose) {
        console.log(e)
      }
      if (RedirectsExport.retryCount >= MAX_RETRIES) {
        process.exit()
      }
      log.error(`Retrying in ${RETRY_INTERVAL_S} seconds...`)
      log.info('Press CTRL+C to abort')
      await sleep(RETRY_INTERVAL_S * 1000)
      RedirectsExport.retryCount++
      await module.exports.default(csvPath)
    }
  }
}
